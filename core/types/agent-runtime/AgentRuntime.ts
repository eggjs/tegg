import type { AgentMessage } from './AgentMessage';
import type { AgentRunConfig, RunStatus } from './AgentStore';

// ===== Error codes =====

export const AgentErrorCode = {
  ExecError: 'EXEC_ERROR',
} as const;
export type AgentErrorCode = (typeof AgentErrorCode)[keyof typeof AgentErrorCode];

// ===== Thread objects =====

export interface ThreadObject {
  id: string;
  object: 'thread';
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface ThreadObjectWithMessages extends ThreadObject {
  messages: AgentMessage[];
}

// ===== Run objects =====

export interface RunObject {
  id: string;
  object: 'thread.run';
  createdAt: number;
  threadId: string;
  status: RunStatus;
  lastError?: { code: string; message: string } | null;
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
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  metadata?: Record<string, unknown>;
  config?: AgentRunConfig;
}

// ===== Run input =====

export interface CreateRunInput {
  threadId?: string;
  /**
   * Populated by AgentRuntime before calling execRun.
   * - true: threadId was provided (resume existing conversation)
   * - false: no threadId provided, new thread created
   */
  isResume?: boolean;
  input: {
    messages: import('./AgentMessage').InputMessage[];
  };
  config?: AgentRunConfig;
  /**
   * Metadata for the run. Stored verbatim on the run record, and additionally
   * shallow-merged into the thread metadata (`meta.json`):
   * - For an auto-created thread, it initializes the thread metadata.
   * - For an existing thread, the keys are shallow-merged: new values overwrite
   *   matching keys, while keys not present are preserved.
   * - An omitted or empty object leaves the thread metadata unchanged.
   */
  metadata?: Record<string, unknown>;
}

// ===== Thread input =====

/**
 * Options for {@link AgentRuntime.createThread}.
 *
 * `metadata` is forwarded verbatim to {@link AgentStore.createThread} so callers
 * can persist additional business semantics on the thread record (e.g. the
 * resolved agent name, owning sandbox id, trace id).
 */
export interface CreateThreadOptions {
  metadata?: Record<string, unknown>;
}

// ===== Stream event (TaskEvent-style wrapper) =====

export interface StreamEvent {
  seq: number;
  type: string;
  data: unknown;
  ts: number;
}

// ===== Get thread options =====

export interface GetThreadOptions {
  /** When true, return all message types (system, result, stream_event, etc.).
   *  Defaults to false — only user and assistant messages are returned. */
  includeAllMessages?: boolean;
}
