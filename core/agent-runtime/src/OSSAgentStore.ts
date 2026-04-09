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

import { nowUnix, newThreadId, newRunId } from './AgentStoreUtils';

export interface OSSAgentStoreOptions {
  client: ObjectStorageClient;
  prefix?: string;
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
 * {prefix}threads/{id}/meta.json      — Thread metadata (JSON)
 * {prefix}threads/{id}/messages.jsonl  — Messages (JSONL, one AgentMessage per line)
 * {prefix}runs/{id}.json              — Run record (JSON)
 * ```
 */
export class OSSAgentStore implements AgentStore {
  private readonly client: ObjectStorageClient;
  private readonly prefix: string;

  constructor(options: OSSAgentStoreOptions) {
    this.client = options.client;
    const raw = options.prefix ?? '';
    this.prefix = raw && !raw.endsWith('/') ? raw + '/' : raw;
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

  async init(): Promise<void> {
    await this.client.init?.();
  }

  async destroy(): Promise<void> {
    await this.client.destroy?.();
  }

  async createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord> {
    const threadId = newThreadId();
    const meta: ThreadMetadata = {
      id: threadId,
      object: AgentObjectType.Thread,
      metadata: metadata ?? {},
      createdAt: nowUnix(),
    };
    await this.client.put(this.threadMetaKey(threadId), JSON.stringify(meta));
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
