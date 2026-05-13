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
 * Warn logger used when a background thread-time-index write fails.
 * `console` and `egg-logger` both satisfy this shape.
 */
export interface OSSAgentStoreWarnLogger {
  warn(message: string, ...args: unknown[]): void;
}

export interface OSSAgentStoreOptions {
  client: ObjectStorageClient;
  prefix?: string;
  /**
   * Background time-index PUT failures are logged here and never
   * propagated to `createThread` callers.
   */
  logger?: OSSAgentStoreWarnLogger;
}

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
 * {prefix}index/threads-by-date/{YYYY-MM-DD}/{revMs13}_{threadId} — Time-index sidecar (JSON body)
 * ```
 *
 * The time-index sidecar is best-effort and write-only. It is not read
 * by `getThread`, and `destroy()` drains any in-flight index writes.
 */
export class OSSAgentStore implements AgentStore {
  private readonly client: ObjectStorageClient;
  private readonly prefix: string;
  private readonly logger: OSSAgentStoreWarnLogger;
  private readonly pendingIndexWrites = new Set<Promise<void>>();

  constructor(options: OSSAgentStoreOptions) {
    this.client = options.client;
    const raw = options.prefix ?? '';
    this.prefix = raw && !raw.endsWith('/') ? raw + '/' : raw;
    this.logger = options.logger ?? { warn: (message, ...args) => console.warn(message, ...args) };
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

  private threadTimeIndexKey(nowMs: number, threadId: string): string {
    const date = dateBucket(nowMs);
    const rev = reverseMs(nowMs);
    return `${this.prefix}index/threads-by-date/${date}/${rev}_${threadId}`;
  }

  async init(): Promise<void> {
    await this.client.init?.();
  }

  async destroy(): Promise<void> {
    await this.awaitPendingWrites();
    await this.client.destroy?.();
  }

  /**
   * Wait for in-flight background time-index writes. Individual write
   * failures are logged by `createThread`, so this method never rejects
   * for index-write failures.
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
        const errForLog: Error = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          '[OSSAgentStore] failed to write thread time index threadId=%s key=%s',
          threadId,
          indexKey,
          errForLog,
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
