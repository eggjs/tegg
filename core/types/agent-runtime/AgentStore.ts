import type { AgentMessage, InputMessage } from './AgentMessage';
import type { GetThreadOptions } from './AgentRuntime';

// ===== Object types =====

export const AgentObjectType = {
  Thread: 'thread',
  ThreadRun: 'thread.run',
} as const;
export type AgentObjectType = (typeof AgentObjectType)[keyof typeof AgentObjectType];

// ===== Run statuses =====

export const RunStatus = {
  Queued: 'queued',
  InProgress: 'in_progress',
  Completed: 'completed',
  Failed: 'failed',
  Cancelled: 'cancelled',
  Cancelling: 'cancelling',
  Expired: 'expired',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

// ===== Run configuration =====

export interface AgentRunConfig {
  maxIterations?: number;
  timeoutMs?: number;
}

// ===== Store records =====

export interface ThreadRecord {
  id: string;
  object: typeof AgentObjectType.Thread;
  /**
   * All messages in the thread, stored as SDK-format AgentMessage objects.
   * In OSSAgentStore the messages are stored separately as a JSONL file
   * and assembled on read — callers should treat this as a unified view
   * regardless of the underlying storage layout.
   */
  messages: AgentMessage[];
  metadata: Record<string, unknown>;
  createdAt: number; // Unix seconds
  /**
   * Id of the most recently created run on this thread, maintained by
   * `createRun` as a best-effort pointer so callers can resolve a thread's
   * latest run without an external index. Absent on threads that have no
   * runs yet, and on threads created before this field existed — a missing
   * value must be treated as "no recent run".
   */
  latestRunId?: string;
}

/**
 * Accumulated token usage for a run.
 *
 * Lives in the types package so both the runtime implementation and the
 * `AgentHandler` contract (controller-decorator) can reference it without a
 * cross-package dependency on the implementation.
 */
export interface RunUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RunRecord {
  id: string;
  object: typeof AgentObjectType.ThreadRun;
  threadId?: string;
  status: RunStatus;
  input: InputMessage[];
  lastError?: { code: string; message: string } | null;
  usage?: RunUsage | null;
  config?: AgentRunConfig;
  metadata?: Record<string, unknown>;
  createdAt: number; // Unix seconds
  startedAt?: number | null; // Unix seconds (legacy; retained for back-compat)
  completedAt?: number | null; // Unix seconds
  cancelledAt?: number | null; // Unix seconds
  failedAt?: number | null; // Unix seconds
  // ms-granular timing (new). Naming: absolute epoch-ms points end in `AtMs`, durations in `Ms`.
  startedAtMs?: number | null;
  completedAtMs?: number | null;
  /** completedAtMs - startedAtMs (end-to-end run wall time in ms). */
  durationMs?: number | null;
  /** Sum of result.duration_api_ms across the run (pure model API time in ms). */
  apiDurationMs?: number | null;
}

// ===== Store interface =====

export interface AgentStore {
  init?(): Promise<void>;
  destroy?(): Promise<void>;
  createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord>;
  getThread(threadId: string, options?: GetThreadOptions): Promise<ThreadRecord>;
  /**
   * Return whether the thread contains at least one conversation message,
   * matching the default filtering semantics of {@link getThread}.
   *
   * Use the exported `isConversationMessage()` from `@eggjs/agent-runtime` to
   * make that call rather than testing `type` directly. Under V1 the two agree —
   * a conversation message is a `user` or `assistant` one — but a V2 record's
   * payload is opaque and declares its own status, so a hard-coded `type` check
   * would report an established V2 thread as empty and make the runtime restart
   * it as a fresh session instead of resuming.
   *
   * Stores may implement this optional capability with a lightweight existence
   * check. Implementations must throw `AgentNotFoundError` when the thread does
   * not exist. AgentRuntime falls back to `getThread()` when it is absent.
   */
  hasMessages?(threadId: string): Promise<boolean>;
  /**
   * Shallow-merge metadata into an existing thread.
   * New values overwrite matching keys; omitted keys are preserved.
   */
  updateThreadMetadata?(threadId: string, metadata: Record<string, unknown>): Promise<void>;
  appendMessages(threadId: string, messages: AgentMessage[]): Promise<void>;
  createRun(
    input: InputMessage[],
    threadId?: string,
    config?: AgentRunConfig,
    metadata?: Record<string, unknown>,
  ): Promise<RunRecord>;
  getRun(runId: string): Promise<RunRecord>;
  /**
   * Id of the most recent run created on the thread, or `null` when the
   * thread exists but has no recorded run (including threads created before
   * run tracking existed). Throws AgentNotFoundError when the thread itself
   * does not exist.
   */
  getLatestRunId(threadId: string): Promise<string | null>;
  updateRun(runId: string, updates: Partial<RunRecord>): Promise<void>;
}
