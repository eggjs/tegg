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
 * Minimal structural type for the warn-logging channel used when a
 * background thread-time-index write fails. Both `egg-logger`'s `EggLogger`
 * and the global `console` satisfy this shape, so applications can pass
 * `app.logger` directly without an explicit import.
 */
export interface OSSAgentStoreWarnLogger {
  warn(message: string, ...args: unknown[]): void;
}

export interface OSSAgentStoreOptions {
  client: ObjectStorageClient;
  prefix?: string;
  /**
   * Sink for warn messages emitted when the background time-index PUT fails.
   * Defaults to a wrapper around `console.warn`. Failures never surface to
   * the `createThread` caller — they are observed exclusively via this logger.
   */
  logger?: OSSAgentStoreWarnLogger;
  /**
   * IANA timezone name (or the literal `'UTC'`) used to compute the
   * `YYYY-MM-DD` date-bucket directory of the time index. Defaults to
   * `'UTC'` so that workers in different physical regions agree on a single
   * partition for a given absolute instant. Set to e.g. `'Asia/Shanghai'`
   * when the analytics calendar follows a specific local timezone.
   */
  dateTimezone?: string;
}

/**
 * Thread metadata stored as a JSON object (excludes messages).
 * Messages are stored separately in a JSONL file for append-friendly writes.
 */
type ThreadMetadata = Omit<ThreadRecord, 'messages'>;

/**
 * AgentStore implementation backed by an ObjectStorageClient (OSS, S3, etc.).
 *
 * ## Storage layout
 *
 * ```
 * {prefix}threads/{id}/meta.json                                  — Thread metadata (JSON, source of truth)
 * {prefix}threads/{id}/messages.jsonl                             — Messages (JSONL, one AgentMessage per line)
 * {prefix}runs/{id}.json                                          — Run record (JSON)
 * {prefix}index/threads-by-date/{YYYY-MM-DD}/{revMs13}_{threadId} — Time index sidecar, body JSON
 * ```
 *
 * The time-index sidecar is a write-only, analytics-facing artifact: it is
 * created best-effort inside `createThread`, never read by `getThread`, and
 * never mutated by `appendMessages` / `createRun` / `updateRun`. Its
 * filename's `revMs13` segment is the decimal complement of the
 * millisecond-precision creation timestamp (see `reverseMs` in
 * `AgentStoreUtils`), which makes the natural ASC-by-key dictionary order
 * of a date directory equivalent to time-DESC order — a workaround for the
 * fact that the OSS / S3 ListObjects API has no reverse-order option. The
 * body is a compact JSON document carrying `{ threadId, createdAt, metadata }`
 * so that consumers reading only the index never need to GET `meta.json`.
 *
 * The index PUT is fire-and-forget: it runs on a background promise tracked
 * in `pendingIndexWrites`, contributes zero latency to `createThread`'s
 * happy path, and a failure produces a single `warn` line via the injected
 * `logger` instead of propagating. Call `awaitPendingWrites()` (or
 * `destroy()`, which calls it internally) when graceful shutdown must wait
 * for in-flight index writes to settle.
 */
export class OSSAgentStore implements AgentStore {
  private readonly client: ObjectStorageClient;
  private readonly prefix: string;
  private readonly logger: OSSAgentStoreWarnLogger;
  private readonly dateTimezone: string;
  /**
   * Background index writes that have not yet settled. Each promise removes
   * itself from the set on resolution or rejection, so the set never grows
   * unboundedly. `awaitPendingWrites()` and `destroy()` drain it.
   */
  private readonly pendingIndexWrites = new Set<Promise<void>>();

  constructor(options: OSSAgentStoreOptions) {
    this.client = options.client;
    const raw = options.prefix ?? '';
    this.prefix = raw && !raw.endsWith('/') ? raw + '/' : raw;
    this.logger = options.logger ?? { warn: (message, ...args) => console.warn(message, ...args) };
    this.dateTimezone = options.dateTimezone ?? 'UTC';
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

  /**
   * Compose the time-index sidecar key for a thread created at `nowMs`.
   * `dateBucket` resolves the timezone, `reverseMs` produces the complement
   * suffix; the threadId is appended verbatim so that consumers can read it
   * from the key without GETting the body.
   */
  private threadTimeIndexKey(nowMs: number, threadId: string): string {
    const date = dateBucket(nowMs, this.dateTimezone);
    const rev = reverseMs(nowMs);
    return `${this.prefix}index/threads-by-date/${date}/${rev}_${threadId}`;
  }

  async init(): Promise<void> {
    await this.client.init?.();
  }

  async destroy(): Promise<void> {
    // Drain pending background index writes before tearing down the
    // underlying client. `Promise.allSettled` swallows individual failures
    // (which are already surfaced via the logger), so destroy() itself
    // never rejects because of an index miss.
    await this.awaitPendingWrites();
    await this.client.destroy?.();
  }

  /**
   * Wait for every in-flight background time-index write to settle (either
   * resolve or reject). Used internally by `destroy()` to keep graceful
   * shutdown from dropping writes, and exposed publicly for tests and
   * external callers that need an explicit drain point.
   *
   * Never rejects — individual write failures have already been turned into
   * `warn` log entries by the catch handler installed in `createThread`.
   */
  async awaitPendingWrites(): Promise<void> {
    if (this.pendingIndexWrites.size === 0) return;
    await Promise.allSettled([ ...this.pendingIndexWrites ]);
  }

  async createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord> {
    const threadId = newThreadId();
    // Take the wall-clock once so the seconds value written into `meta.createdAt`
    // and the millisecond value encoded into the index key derive from the same
    // physical instant. Two separate `Date.now()` reads could disagree across
    // a millisecond boundary and, near midnight, even across the date bucket.
    const nowMs = Date.now();
    const createdAt = Math.floor(nowMs / 1000);
    const meta: ThreadMetadata = {
      id: threadId,
      object: AgentObjectType.Thread,
      metadata: metadata ?? {},
      createdAt,
    };
    // 1) Main path. Failure surfaces to the caller exactly as before.
    await this.client.put(this.threadMetaKey(threadId), JSON.stringify(meta));

    // 2) Time-index sidecar. Fire-and-forget: the promise is tracked in
    //    `pendingIndexWrites` so graceful shutdown can drain it, but
    //    `createThread` does not await it and a rejection produces a
    //    warn log rather than propagating. The two-arg `.then(success,
    //    failure)` form serves both as a handler and as the standard
    //    means of silencing the unhandled-rejection warning.
    const indexKey = this.threadTimeIndexKey(nowMs, threadId);
    const indexBody = JSON.stringify({
      threadId,
      createdAt,
      metadata: meta.metadata,
    });
    const tracked: Promise<void> = this.client.put(indexKey, indexBody).then(
      () => {
        this.pendingIndexWrites.delete(tracked);
      },
      (err: unknown) => {
        this.pendingIndexWrites.delete(tracked);
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          '[OSSAgentStore] failed to write thread time index threadId=%s key=%s err=%s',
          threadId,
          indexKey,
          message,
        );
      },
    );
    this.pendingIndexWrites.add(tracked);

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

    // By default only return conversation messages (user + assistant),
    // aligned with SDK's getSessionMessages behavior.
    // The JSONL file stores all message types as a complete event log;
    // this filter provides the application-level conversation view.
    if (!options?.includeAllMessages) {
      messages = messages.filter(m => m.type === 'user' || m.type === 'assistant');
    }

    return { ...meta, messages };
  }

  async appendMessages(threadId: string, messages: AgentMessage[]): Promise<void> {
    const metaData = await this.client.get(this.threadMetaKey(threadId));
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    if (messages.length === 0) return;

    const lines = messages.map(m => JSON.stringify(m)).join('\n') + '\n';
    const messagesKey = this.threadMessagesKey(threadId);

    if (this.client.append) {
      await this.client.append(messagesKey, lines);
    } else {
      const existing = (await this.client.get(messagesKey)) ?? '';
      await this.client.put(messagesKey, existing + lines);
    }
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
    return record;
  }

  async getRun(runId: string): Promise<RunRecord> {
    const data = await this.client.get(this.runKey(runId));
    if (!data) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    return JSON.parse(data) as RunRecord;
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
