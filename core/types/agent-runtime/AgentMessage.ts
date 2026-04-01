// ===== Content block types =====

export const ContentBlockType = {
  Text: 'text',
  ToolUse: 'tool_use',
  ToolResult: 'tool_result',
} as const;
export type ContentBlockType = (typeof ContentBlockType)[keyof typeof ContentBlockType];

// ===== Input content types (SDK → tegg) =====

export interface TextInputContentPart {
  type: typeof ContentBlockType.Text;
  text: string;
}

export interface ToolUseInputContentPart {
  type: typeof ContentBlockType.ToolUse;
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultInputContentPart {
  type: typeof ContentBlockType.ToolResult;
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

// ===== Output content types (tegg → storage/SSE) =====

export interface TextContentBlock {
  type: typeof ContentBlockType.Text;
  text: { value: string; annotations: unknown[] };
}

export interface ToolUseContentBlock {
  type: typeof ContentBlockType.ToolUse;
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContentBlock {
  type: typeof ContentBlockType.ToolResult;
  tool_use_id: string;
  content?: string | { type: string; text?: string; [key: string]: unknown }[];
  is_error?: boolean;
}

export interface GenericContentBlock {
  type: string;
  [key: string]: unknown;
}

export type MessageContentBlock =
  | TextContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock
  | GenericContentBlock;

// ===== Input / Output message types =====

export interface InputMessage {
  role: string;
  content: string | InputContentPart[];
  metadata?: Record<string, unknown>;
}

export interface MessageObject {
  id: string;
  object: string;
  createdAt: number;
  role: string;
  status: string;
  content: MessageContentBlock[];
  runId?: string;
  threadId?: string;
}
