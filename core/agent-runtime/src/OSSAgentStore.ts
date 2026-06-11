import type {
  AgentMessage,
  AgentRunConfig,
  AgentStore,
  GetThreadOptions,
  InputMessage,
  RunRecord,
  ThreadRecord,
  ObjectStorageClient } from '@eggjs/tegg-types/agent-runtime';
import { AgentObjectType, RunStatus, AgentNotFoundError } from '@eggjs/tegg-types/agent-runtime';

import { dateBucket, newRunId, newThreadId, nowUnix, reverseMs } from './AgentStoreUtils';

/**
 * Warn logger used when a background thread activity-index write fails.
 * `console` and `egg-logger` both satisfy this shape.
 */
export interface OSSAgentStoreWarnLogger {
  warn(message: string, ...args: unknown[]): void;
}

export interface OSSAgentStoreOptions {
  client: ObjectStorageClient;
  prefix?: string;
  /**
   * Background activity-index PUT failures are logged here and never
   * propagated to store callers.
   */
  logger?: OSSAgentStoreWarnLogger;
  /**
   * Minimum gap, in milliseconds, between activity-index sidecar writes for a
   * single thread from `appendMessages`. Defaults to `0` (write on every
   * append — the historical behaviour).
   *
   * Each append otherwise emits a brand-new index object (the key embeds a
   * millisecond timestamp), so callers that append many times per turn (e.g. a
   * runtime configured with `flushGranularity: 'message'`) would produce one
   * sidecar per message. Set a small value (e.g. `5000`) to coalesce those into
   * roughly one write per interval. The activity index is best-effort and
   * deduped by readers (max `updatedAt` per thread), so throttling only makes
   * the displayed `updatedAt` lag by at most this interval; it never drops a
   * thread from the index. `createThread` and `updateThreadMetadata` are not
   * throttled — they always write.
   */
  indexThrottleMs?: number;
}

/**
 * Upper bound on `lastAppendIndexAtMs` entries (only populated when index
 * throttling is enabled). When exceeded, the oldest-inserted entry is evicted
 * FIFO so the map cannot grow without bound on a long-lived process. Evicting a
 * cold thread only costs it one extra (un-throttled) index write next time.
 */
const MAX_THROTTLE_ENTRIES = 10_000;

/**
 * Thread metadata stored as a JSON object (excludes messages).
 * Messages are stored separately in a JSONL file for append-friendly
 * writes.
 */
type ThreadMetadata = Omit<ThreadRecord, 'messages'>;

/**
 * `AgentStore` implementation backed by an `ObjectStorageClient` (OSS,
 * S3, etc.).
 *
 * ## Storage layout
 *
 * ```
 * {prefix}threads/{id}/meta.json                                  — Thread metadata (JSON, source of truth)
 * {prefix}threads/{id}/messages.jsonl                             — Messages (JSONL, one AgentMessage per line)
 * {prefix}runs/{id}.json                                          — Run record (JSON)
 * {prefix}index/threads-by-updated-date/{YYYY-MM-DD}/{revMs13}_{threadId} — Activity-time index sidecar (JSON body)
 * ```
 *
 * The activity-time index sidecar is best-effort and write-only. It is not read
 * by `getThread`, and `destroy()` drains any in-flight index writes.
 */
export class OSSAgentStore implements AgentStore {
  private readonly client: ObjectStorageClient;
  private readonly prefix: string;
  private readonly logger: OSSAgentStoreWarnLogger;
  private readonly indexThrottleMs: number;
  private readonly pendingIndexWrites = new Set<Promise<void>>();
  private readonly threadMetaWriteTails = new Map<string, Promise<void>>();
  /** Last `appendMessages` activity-index write time per thread (ms), for throttling. */
  private readonly lastAppendIndexAtMs = new Map<string, number>();

  constructor(options: OSSAgentStoreOptions) {
    this.client = options.client;
    const raw = options.prefix ?? '';
    this.prefix = raw && !raw.endsWith('/') ? raw + '/' : raw;
    this.logger = options.logger ?? { warn: (message, ...args) => console.warn(message, ...args) };
    this.indexThrottleMs = options.indexThrottleMs && options.indexThrottleMs > 0 ? options.indexThrottleMs : 0;
  }

  private threadMetaKey(threadId: string): string {
    return `${this.prefix}threads/${threadId}/meta.json`;
  }

  private threadMessagesKey(threadId: string): string {
    return `${this.prefix}threads/${threadId}/messages.jsonl`;
  }

  private runKey(runId: string): string {
    return `${this.prefix}runs/${runId}.json`;
  }

  private threadActivityIndexKey(nowMs: number, threadId: string): string {
    const date = dateBucket(nowMs);
    const rev = reverseMs(nowMs);
    return `${this.prefix}index/threads-by-updated-date/${date}/${rev}_${threadId}`;
  }

  private writeThreadActivityIndex(
    threadId: string,
    createdAt: number,
    updatedAtMs: number,
    metadata: Record<string, unknown>,
  ): void {
    const indexKey = this.threadActivityIndexKey(updatedAtMs, threadId);
    const indexBody = JSON.stringify({
      threadId,
      createdAt,
      updatedAt: Math.floor(updatedAtMs / 1000),
      metadata,
    });
    const tracked: Promise<void> = this.client.put(indexKey, indexBody)
      .catch((err: unknown) => {
        const errForLog: Error = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          '[OSSAgentStore] failed to write thread activity index threadId=%s key=%s',
          threadId,
          indexKey,
          errForLog,
        );
      })
      .finally(() => {
        this.pendingIndexWrites.delete(tracked);
      });
    this.pendingIndexWrites.add(tracked);
  }

  async init(): Promise<void> {
    await this.client.init?.();
  }

  async destroy(): Promise<void> {
    await this.awaitPendingWrites();
    await this.client.destroy?.();
  }

  /**
   * Wait for in-flight background activity-index writes. Individual write
   * failures are logged when scheduled, so this method never rejects
   * for index-write failures. The set size is bounded by in-flight index PUTs.
   */
  async awaitPendingWrites(): Promise<void> {
    while (this.pendingIndexWrites.size > 0) {
      await Promise.allSettled([ ...this.pendingIndexWrites ]);
    }
  }

  async createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord> {
    const threadId = newThreadId();
    const nowMs = Date.now();
    const createdAt = Math.floor(nowMs / 1000);
    const meta: ThreadMetadata = {
      id: threadId,
      object: AgentObjectType.Thread,
      metadata: metadata ?? {},
      createdAt,
    };
    await this.client.put(this.threadMetaKey(threadId), JSON.stringify(meta));

    this.writeThreadActivityIndex(threadId, createdAt, nowMs, meta.metadata);

    return { ...meta, messages: [] };
  }

  async getThread(threadId: string, options?: GetThreadOptions): Promise<ThreadRecord> {
    const [ metaData, messagesData ] = await Promise.all([
      this.client.get(this.threadMetaKey(threadId)),
      this.client.get(this.threadMessagesKey(threadId)),
    ]);
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    const meta = JSON.parse(metaData) as ThreadMetadata;

    let messages: AgentMessage[] = messagesData
      ? messagesData
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line) as AgentMessage)
      : [];

    // By default only return the conversation-shape messages (user +
    // assistant), matching the SDK's `getSessionMessages` semantics.
    // The JSONL file is the full event log including framework-level
    // entries (system events, tool results, etc.); the filter
    // narrows the visible set to the application-level conversation.
    if (!options?.includeAllMessages) {
      messages = messages.filter(m => m.type === 'user' || m.type === 'assistant');
    }

    return { ...meta, messages };
  }

  /**
   * Serialize read-modify-write operations on a single thread's `meta.json`
   * within this process. Both {@link updateThreadMetadata} (business metadata
   * merge) and {@link recordLatestRunId} (the `latestRunId` pointer) mutate the
   * same `meta.json` with no compare-and-swap, so without a shared per-thread
   * lock a concurrent run could clobber the other's write. Cross-process writes
   * remain last-writer-wins.
   *
   * The lock is a per-thread promise chain: `current` is always resolved in the
   * `finally` (decoupled from `fn`'s success/failure), so a rejecting `fn` never
   * leaves the chain stuck for subsequent waiters.
   */
  private async runExclusiveThreadMetaWrite<T>(threadId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.threadMetaWriteTails.get(threadId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.threadMetaWriteTails.set(threadId, tail);

    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.threadMetaWriteTails.get(threadId) === tail) {
        this.threadMetaWriteTails.delete(threadId);
      }
    }
  }

  async updateThreadMetadata(threadId: string, metadata: Record<string, unknown>): Promise<void> {
    if (Object.keys(metadata).length === 0) return;

    await this.runExclusiveThreadMetaWrite(threadId, async () => {
      const metaData = await this.client.get(this.threadMetaKey(threadId));
      if (!metaData) {
        throw new AgentNotFoundError(`Thread ${threadId} not found`);
      }
      const meta = JSON.parse(metaData) as ThreadMetadata;
      const mergedMetadata = { ...meta.metadata, ...metadata };
      await this.client.put(this.threadMetaKey(threadId), JSON.stringify({
        ...meta,
        metadata: mergedMetadata,
      }));
      this.writeThreadActivityIndex(threadId, meta.createdAt, Date.now(), mergedMetadata);
    });
  }

  async appendMessages(threadId: string, messages: AgentMessage[]): Promise<void> {
    const metaData = await this.client.get(this.threadMetaKey(threadId));
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    if (messages.length === 0) return;
    const meta = JSON.parse(metaData) as ThreadMetadata;
    const nowMs = Date.now();

    const lines = messages.map(m => JSON.stringify(m)).join('\n') + '\n';
    const messagesKey = this.threadMessagesKey(threadId);

    if (this.client.append) {
      await this.client.append(messagesKey, lines);
    } else {
      const existing = (await this.client.get(messagesKey)) ?? '';
      await this.client.put(messagesKey, existing + lines);
    }
    // Throttle the activity-index sidecar so a burst of appends (e.g. a runtime
    // flushing one message at a time) does not emit one index object each. The
    // bookkeeping map is only touched when throttling is enabled, so the
    // default (indexThrottleMs=0) path is byte-for-byte the historical one.
    if (this.indexThrottleMs > 0) {
      const last = this.lastAppendIndexAtMs.get(threadId) ?? 0;
      if (nowMs - last < this.indexThrottleMs) return;
      this.lastAppendIndexAtMs.set(threadId, nowMs);
      if (this.lastAppendIndexAtMs.size > MAX_THROTTLE_ENTRIES) {
        const oldest = this.lastAppendIndexAtMs.keys().next().value;
        if (oldest !== undefined) this.lastAppendIndexAtMs.delete(oldest);
      }
    }
    this.writeThreadActivityIndex(threadId, meta.createdAt, nowMs, meta.metadata);
  }

  async createRun(
    input: InputMessage[],
    threadId?: string,
    config?: AgentRunConfig,
    metadata?: Record<string, unknown>,
  ): Promise<RunRecord> {
    const runId = newRunId();
    const record: RunRecord = {
      id: runId,
      object: AgentObjectType.ThreadRun,
      threadId,
      status: RunStatus.Queued,
      input,
      config,
      metadata,
      createdAt: nowUnix(),
    };
    await this.client.put(this.runKey(runId), JSON.stringify(record));
    if (threadId) {
      // Fire-and-forget: keep the latestRunId pointer write off the run-creation
      // hot path (it would otherwise add a GET+PUT roundtrip to every run
      // start). Tracked in pendingIndexWrites — same as writeThreadActivityIndex
      // — so destroy() drains it before shutdown. recordLatestRunId never rejects
      // (it logs and swallows), so no unhandled rejection can leak here.
      const tracked: Promise<void> = this.recordLatestRunId(threadId, runId)
        .finally(() => {
          this.pendingIndexWrites.delete(tracked);
        });
      this.pendingIndexWrites.add(tracked);
    }
    return record;
  }

  /**
   * Record `runId` as the thread's most recent run by merging `latestRunId`
   * into the thread metadata (a read-modify-write on `meta.json` that
   * preserves all existing fields).
   *
   * Runs in the background (scheduled fire-and-forget by `createRun` and
   * tracked in `pendingIndexWrites`) so it never adds latency to run creation;
   * `awaitPendingWrites()` / `destroy()` drain it.
   *
   * Best-effort: a missing thread meta or any storage error is logged and
   * swallowed. When it is skipped, `getLatestRunId` simply degrades to
   * returning the previously recorded value (or `null`).
   *
   * Weak consistency: because the write is asynchronous and an unconditional
   * read-modify-write with no compare-and-swap, `getLatestRunId` is eventually
   * consistent — a read racing a just-created run may briefly see the prior
   * value, and concurrent runs in different processes are last-writer-wins.
   * Within one process it shares {@link runExclusiveThreadMetaWrite} with
   * `updateThreadMetadata`, so the two never clobber each other's `meta.json`.
   */
  private async recordLatestRunId(threadId: string, runId: string): Promise<void> {
    try {
      await this.runExclusiveThreadMetaWrite(threadId, async () => {
        const metaData = await this.client.get(this.threadMetaKey(threadId));
        if (!metaData) {
          this.logger.warn(
            '[OSSAgentStore] skip latestRunId write: thread meta not found threadId=%s runId=%s',
            threadId,
            runId,
          );
          return;
        }
        const meta = JSON.parse(metaData) as ThreadMetadata;
        meta.latestRunId = runId;
        await this.client.put(this.threadMetaKey(threadId), JSON.stringify(meta));
      });
    } catch (err: unknown) {
      const errForLog: Error = err instanceof Error ? err : new Error(String(err));
      this.logger.warn(
        '[OSSAgentStore] failed to record latestRunId threadId=%s runId=%s',
        threadId,
        runId,
        errForLog,
      );
    }
  }

  async getRun(runId: string): Promise<RunRecord> {
    const data = await this.client.get(this.runKey(runId));
    if (!data) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    return JSON.parse(data) as RunRecord;
  }

  async getLatestRunId(threadId: string): Promise<string | null> {
    const metaData = await this.client.get(this.threadMetaKey(threadId));
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    const meta = JSON.parse(metaData) as ThreadMetadata;
    return meta.latestRunId ?? null;
  }

  async updateRun(runId: string, updates: Partial<RunRecord>): Promise<void> {
    const run = await this.getRun(runId);
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete (safeUpdates as any).object;
    Object.assign(run, safeUpdates);
    await this.client.put(this.runKey(runId), JSON.stringify(run));
  }
}
