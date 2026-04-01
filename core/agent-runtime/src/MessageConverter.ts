import type {
  CreateRunInput,
  MessageObject,
  MessageContentBlock,
  TextContentBlock,
  ToolUseContentBlock,
  ToolResultContentBlock,
  AgentStreamMessage,
  AgentStreamMessagePayload,
  TextInputContentPart,
} from '@eggjs/tegg-types/agent-runtime';
import { AgentObjectType, MessageRole, MessageStatus, ContentBlockType } from '@eggjs/tegg-types/agent-runtime';

export function isTextBlock(block: MessageContentBlock): block is TextContentBlock {
  return block.type === ContentBlockType.Text;
}

export function isToolUseBlock(block: MessageContentBlock): block is ToolUseContentBlock {
  return block.type === ContentBlockType.ToolUse;
}

export function isToolResultBlock(block: MessageContentBlock): block is ToolResultContentBlock {
  return block.type === ContentBlockType.ToolResult;
}

interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

export function isThinkingBlock(block: MessageContentBlock): block is ThinkingBlock & MessageContentBlock {
  return block.type === 'thinking';
}

import { nowUnix, newMsgId } from './AgentStoreUtils';
import type { RunUsage } from './RunBuilder';

export class MessageConverter {
  /**
   * Convert an AgentStreamMessage's message payload into MessageContentBlock[].
   * Text blocks are wrapped in { value, annotations } format.
   * Non-text blocks (tool_use, tool_result, etc.) are passed through as-is.
   */
  static toContentBlocks(msg: AgentStreamMessagePayload): MessageContentBlock[] {
    if (!msg) return [];
    const content = msg.content;
    if (typeof content === 'string') {
      return [{ type: ContentBlockType.Text, text: { value: content, annotations: [] } }];
    }
    if (Array.isArray(content)) {
      return content.map(part => {
        if (part.type === ContentBlockType.Text) {
          return {
            type: ContentBlockType.Text,
            text: { value: (part as TextInputContentPart).text, annotations: [] },
          } as MessageContentBlock;
        }
        return part as MessageContentBlock;
      });
    }
    return [];
  }

  /**
   * Build a completed MessageObject from an AgentStreamMessage payload.
   */
  static toMessageObject(msg: AgentStreamMessagePayload, runId?: string): MessageObject {
    return {
      id: newMsgId(),
      object: AgentObjectType.ThreadMessage,
      createdAt: nowUnix(),
      runId,
      role: MessageRole.Assistant,
      status: MessageStatus.Completed,
      content: MessageConverter.toContentBlocks(msg),
    };
  }

  /**
   * Extract MessageObjects and accumulated usage from AgentStreamMessage objects.
   */
  static extractFromStreamMessages(
    messages: AgentStreamMessage[],
    runId?: string,
  ): {
      output: MessageObject[];
      usage?: RunUsage;
    } {
    const contentBlocks: MessageContentBlock[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let hasUsage = false;

    for (const msg of messages) {
      if (msg.message && msg.accumulate !== false) {
        contentBlocks.push(...MessageConverter.toContentBlocks(msg.message));
      }
      if (msg.usage) {
        hasUsage = true;
        promptTokens += msg.usage.promptTokens ?? 0;
        completionTokens += msg.usage.completionTokens ?? 0;
      }
    }

    const mergedContent = MessageConverter.mergeContentBlocks(contentBlocks);
    const output: MessageObject[] = mergedContent.length > 0
      ? [{
        id: newMsgId(),
        object: AgentObjectType.ThreadMessage,
        createdAt: nowUnix(),
        runId,
        role: MessageRole.Assistant,
        status: MessageStatus.Completed,
        content: mergedContent,
      }]
      : [];

    let usage: RunUsage | undefined;
    if (hasUsage) {
      usage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
    }

    return { output, usage };
  }

  /** Content block types allowed in the final assembled message. */
  private static readonly ALLOWED_BLOCK_TYPES = new Set([
    ContentBlockType.Text,     // text
    ContentBlockType.ToolUse,  // tool_use
    ContentBlockType.ToolResult, // tool_result
    'thinking',                // extended thinking
  ]);

  /**
   * Normalize raw SDK streaming event blocks (e.g. Anthropic content_block_start/delta/stop)
   * into standard content blocks that mergeContentBlocks can process.
   *
   * Two-phase approach:
   * 1. Unwrap streaming protocol events to extract actual content
   * 2. Whitelist filter — only keep known content block types
   */
  static normalizeContentBlocks(blocks: MessageContentBlock[]): MessageContentBlock[] {
    const unwrapped: MessageContentBlock[] = [];
    for (const block of blocks) {
      const b = block as Record<string, any>;

      // --- Phase 1: Unwrap streaming protocol events ---

      // content_block_start → extract tool_use; discard others (text/thinking start are just markers)
      if (b.type === 'content_block_start') {
        if (b.content_block?.type === ContentBlockType.ToolUse) {
          const cb = b.content_block;
          unwrapped.push({ type: ContentBlockType.ToolUse, id: cb.id, name: cb.name, input: cb.input ?? {} } as ToolUseContentBlock);
        }
        continue;
      }

      // content_block_delta → extract content from known delta subtypes
      if (b.type === 'content_block_delta') {
        if (b.delta?.type === 'text_delta') {
          const text: string = b.delta.text || '';
          if (text) {
            unwrapped.push({ type: ContentBlockType.Text, text: { value: text, annotations: [] } } as TextContentBlock);
          }
        } else if (b.delta?.type === 'input_json_delta') {
          const partial: string = b.delta.partial_json || '';
          if (partial) {
            unwrapped.push({ type: ContentBlockType.Text, text: { value: partial, annotations: [] } } as TextContentBlock);
          }
        } else if (b.delta?.type === 'thinking_delta') {
          const thinking: string = b.delta.thinking || '';
          if (thinking) {
            unwrapped.push({ type: 'thinking', thinking } as unknown as MessageContentBlock);
          }
        }
        // Other deltas (signature_delta, etc.) → discard
        continue;
      }

      // Streaming control signals → discard
      if (b.type === 'content_block_stop' || b.type === 'message_stop' || b.type === 'message_delta') {
        continue;
      }

      // Non-streaming blocks (already standard or generic) → pass to phase 2
      unwrapped.push(block);
    }

    // --- Phase 2: Whitelist filter ---
    return unwrapped.filter(b => MessageConverter.ALLOWED_BLOCK_TYPES.has(b.type));
  }

  /**
   * Merge accumulated content blocks into a clean final form:
   * 1. Consecutive text blocks are merged into a single text block.
   * 2. Text blocks immediately following a tool_use block (before the next
   *    tool_result) are treated as input_json_delta fragments — they are
   *    concatenated, JSON-parsed, and written into the tool_use block's input.
   */
  static mergeContentBlocks(blocks: MessageContentBlock[]): MessageContentBlock[] {
    if (blocks.length === 0) return blocks;
    blocks = MessageConverter.normalizeContentBlocks(blocks);

    const merged: MessageContentBlock[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (isToolUseBlock(block)) {
        // Collect subsequent text blocks as input_json_delta fragments
        const inputFragments: string[] = [];
        let next = blocks[i + 1];
        while (next && isTextBlock(next)) {
          i++;
          inputFragments.push(next.text.value);
          next = blocks[i + 1];
        }
        if (inputFragments.length > 0) {
          const raw = inputFragments.join('');
          let parsedInput: Record<string, unknown>;
          try {
            parsedInput = JSON.parse(raw);
          } catch {
            parsedInput = {};
          }
          merged.push({ ...block, input: { ...block.input, ...parsedInput } });
        } else {
          merged.push(block);
        }
      } else if (isTextBlock(block)) {
        // Merge consecutive text blocks
        const parts: string[] = [ block.text.value ];
        let next = blocks[i + 1];
        while (next && isTextBlock(next)) {
          i++;
          parts.push(next.text.value);
          next = blocks[i + 1];
        }
        merged.push({
          type: ContentBlockType.Text,
          text: { value: parts.join(''), annotations: [] },
        });
      } else if (isThinkingBlock(block)) {
        // Merge consecutive thinking blocks
        const parts: string[] = [ (block as unknown as ThinkingBlock).thinking ];
        let next = blocks[i + 1];
        while (next && isThinkingBlock(next)) {
          i++;
          parts.push((next as unknown as ThinkingBlock).thinking);
          next = blocks[i + 1];
        }
        merged.push({ type: 'thinking', thinking: parts.join('') } as unknown as MessageContentBlock);
      } else {
        merged.push(block);
      }
    }

    return merged;
  }

  /**
   * Produce a completed copy of a streaming MessageObject with final content.
   */
  static completeMessage(msg: MessageObject, content: MessageContentBlock[]): MessageObject {
    return { ...msg, status: MessageStatus.Completed, content };
  }

  /**
   * Create an in-progress MessageObject for streaming (before content is known).
   */
  static createStreamMessage(msgId: string, runId: string): MessageObject {
    return {
      id: msgId,
      object: AgentObjectType.ThreadMessage,
      createdAt: nowUnix(),
      runId,
      role: MessageRole.Assistant,
      status: MessageStatus.InProgress,
      content: [],
    };
  }

  /**
   * Convert input messages to MessageObjects for thread history.
   * System messages are filtered out — they are transient instructions, not conversation history.
   */
  static toInputMessageObjects(messages: CreateRunInput['input']['messages'], threadId?: string): MessageObject[] {
    return messages
      .filter(
        (m): m is typeof m & { role: Exclude<typeof m.role, typeof MessageRole.System> } =>
          m.role !== MessageRole.System,
      )
      .map(m => ({
        id: newMsgId(),
        object: AgentObjectType.ThreadMessage,
        createdAt: nowUnix(),
        threadId,
        role: m.role,
        status: MessageStatus.Completed,
        content:
          typeof m.content === 'string'
            ? [{ type: ContentBlockType.Text, text: { value: m.content, annotations: [] } }]
            : m.content.map(p => {
              if (p.type === ContentBlockType.Text) {
                return {
                  type: ContentBlockType.Text,
                  text: { value: (p as TextInputContentPart).text, annotations: [] },
                } as MessageContentBlock;
              }
              return p as MessageContentBlock;
            }),
      }));
  }
}
