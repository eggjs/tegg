// ===== Input content types (for CreateRunInput) =====

export interface TextInputContentPart {
  type: 'text';
  text: string;
}

export interface ToolUseInputContentPart {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultInputContentPart {
  type: 'tool_result';
  tool_use_id: string;
  content?: string | { type: string; text?: string; [key: string]: unknown }[];
  is_error?: boolean;
}

export interface GenericInputContentPart {
  type: string;
  [key: string]: unknown;
}

export type InputContentPart =
  | TextInputContentPart
  | ToolUseInputContentPart
  | ToolResultInputContentPart
  | GenericInputContentPart;

// ===== Input message (for CreateRunInput) =====

export interface InputMessage {
  role: string;
  content: string | InputContentPart[];
  metadata?: Record<string, unknown>;
}

// ===== AgentMessage — aligned with Claude Agent SDK SDKMessage =====
// Lightweight subset of SDK message types. The framework only needs to
// discriminate on `type` for a handful of core message kinds; everything
// else passes through as SDKGenericMessage.

/**
 * Timestamp of when this message was received from the underlying SDK
 * stream, expressed as an ISO 8601 UTC string (e.g.
 * `"2026-05-07T12:34:56.789Z"`). Set by the runtime at receive time so
 * downstream consumers can derive per-step latency such as tool
 * execution duration.
 *
 * **Format choice**: ISO 8601 mirrors the format Claude Code's own
 * jsonl transcript uses today, so when the upstream SDK eventually
 * exposes this field natively (see anthropics/claude-agent-sdk-python#258),
 * the shape will be drop-in compatible.
 *
 * **Backwards compatibility**: messages persisted by older runtime
 * versions will not have this field; consumers should treat it as
 * optional and fall back to `Thread.createdAt` (or the surrounding
 * `result.duration_ms`) when missing.
 *
 * **Forward compatibility**: if a future SDK release supplies its own
 * `timestamp` on a message (matching this format), the runtime
 * preserves it instead of overwriting.
 */
export interface AgentMessageMeta {
  timestamp?: string;
}

export interface SDKSystemMessage extends AgentMessageMeta {
  type: 'system';
  subtype: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface SDKStreamEvent extends AgentMessageMeta {
  type: 'stream_event';
  event: unknown;
  session_id?: string;
  [key: string]: unknown;
}

export interface SDKUserMessage extends AgentMessageMeta {
  type: 'user';
  message: unknown;
  [key: string]: unknown;
}

export interface SDKAssistantMessage extends AgentMessageMeta {
  type: 'assistant';
  message: unknown;
  [key: string]: unknown;
}

export interface SDKResultMessage extends AgentMessageMeta {
  type: 'result';
  subtype: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SDKGenericMessage extends AgentMessageMeta {
  type: string;
  [key: string]: unknown;
}

export type AgentMessage =
  | SDKSystemMessage
  | SDKStreamEvent
  | SDKUserMessage
  | SDKAssistantMessage
  | SDKResultMessage
  | SDKGenericMessage;
