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

  /**
   * Merge accumulated content blocks into a clean final form:
   * 1. Consecutive text blocks are merged into a single text block.
   * 2. Text blocks immediately following a tool_use block (before the next
   *    tool_result) are treated as input_json_delta fragments — they are
   *    concatenated, JSON-parsed, and written into the tool_use block's input.
   */
  static mergeContentBlocks(blocks: MessageContentBlock[]): MessageContentBlock[] {
    if (blocks.length === 0) return blocks;

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
