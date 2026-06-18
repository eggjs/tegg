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

// ===== Framework extension envelope (eggExt) =====
// Additive metadata the agent-runtime / executor layer attaches to messages,
// namespaced under a single `eggExt` key so it never collides with current or
// future Claude Agent SDK fields. SDK payloads (the `message` field) are never
// touched. Time-field naming convention: absolute epoch-ms points end in
// `AtMs`; durations / intervals in ms end in `Ms`.

/** Per-message timing, stamped by the executor as each message streams in. */
export interface MessageTiming {
  /** Epoch ms when the executor received this message — authoritative per-message time. */
  receivedAtMs: number;
  /** Gap in ms since the previous persisted message's `receivedAtMs`. */
  sincePrevMs?: number;
  /** assistant only: ms the model took to generate this message (turn `message_start` → arrival). */
  genMs?: number;
  /** assistant only: time-to-first-token in ms, carried over from the turn's `stream_event`. */
  ttftMs?: number;
}

/** Precise execution timing for a single tool call, derived from PreToolUse / PostToolUse hooks. */
export interface ToolTiming {
  toolUseId: string;
  name: string;
  /** Epoch ms when the tool started executing (PreToolUse). */
  startedAtMs: number;
  /** Epoch ms when the tool finished (PostToolUse); `null` when interrupted before completion. */
  endedAtMs: number | null;
  /** `endedAtMs - startedAtMs`; `null` when the tool did not finish. */
  durationMs: number | null;
  isError?: boolean;
  /** Set when the tool ran inside a sub-agent. */
  agentId?: string;
}

/** Single `eggExt` namespace carrying all framework extension fields on a message. */
export interface EggExt {
  /** Owning runId. Mirrored here as the forward-looking canonical location; also kept top-level for back-compat. */
  runId?: string;
  /** Per-message timing. */
  timing?: MessageTiming;
  /** Per-tool timing; present on `user` messages that carry tool_result blocks. */
  toolTimings?: ToolTiming[];
  /**
   * Epoch ms when the store persisted this message (server-side clock). A
   * fallback / drift-calibration timestamp stamped on every persisted message;
   * it never overwrites the executor-stamped per-message `timing`. For input
   * messages (which carry no `timing`) this is their only time field.
   */
  persistedAtMs?: number;
}

/** Mixin giving every AgentMessage member the `eggExt` extension namespace. */
export interface AgentMessageExtensions {
  eggExt?: EggExt;
}

// ===== AgentMessage — aligned with Claude Agent SDK SDKMessage =====
// Lightweight subset of SDK message types. The framework only needs to
// discriminate on `type` for a handful of core message kinds; everything
// else passes through as SDKGenericMessage.

export interface SDKSystemMessage extends AgentMessageExtensions {
  type: 'system';
  subtype: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface SDKStreamEvent extends AgentMessageExtensions {
  type: 'stream_event';
  event: unknown;
  session_id?: string;
  [key: string]: unknown;
}

export interface SDKUserMessage extends AgentMessageExtensions {
  type: 'user';
  message: unknown;
  [key: string]: unknown;
}

export interface SDKAssistantMessage extends AgentMessageExtensions {
  type: 'assistant';
  message: unknown;
  [key: string]: unknown;
}

export interface SDKResultMessage extends AgentMessageExtensions {
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

export interface SDKGenericMessage extends AgentMessageExtensions {
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
