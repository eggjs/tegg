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
  startedAt?: number | null;
  completedAt?: number | null;
  cancelledAt?: number | null;
  failedAt?: number | null;
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
  metadata?: Record<string, unknown>;
}

// ===== Thread input =====

/**
 * Options for {@link AgentRuntime.createThread}.
 *
 * `metadata` is forwarded verbatim to {@link AgentStore.createThread} so callers
 * can persist additional business semantics on the thread record (e.g. the
 * resolved agent name, owning sandbox id, trace id). It is stored once at
 * creation time and never overwritten by subsequent runs on the same thread.
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
