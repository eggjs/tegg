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
   * Merge adjacent text content blocks into a single block.
   * Non-text blocks act as natural boundaries and are never merged.
   */
  static consolidateContentBlocks(blocks: MessageContentBlock[]): MessageContentBlock[] {
    const result: MessageContentBlock[] = [];
    for (const block of blocks) {
      const prev = result[result.length - 1];
      if (
        prev && prev.type === ContentBlockType.Text && block.type === ContentBlockType.Text
      ) {
        const prevText = prev as TextContentBlock;
        const curText = block as TextContentBlock;
        prevText.text = {
          value: prevText.text.value + curText.text.value,
          annotations: [...prevText.text.annotations, ...curText.text.annotations],
        };
      } else if (block.type === ContentBlockType.Text) {
        const curText = block as TextContentBlock;
        result.push({
          ...curText,
          text: { ...curText.text, annotations: [...curText.text.annotations] },
        });
      } else {
        result.push({ ...block });
      }
    }
    return result;
  }

  /**
   * Extract MessageObjects and accumulated usage from AgentStreamMessage objects.
   * Adjacent text content blocks from streaming chunks are consolidated into
   * a single message with merged text, matching the OpenAI Assistants API behavior.
   */
  static extractFromStreamMessages(
    messages: AgentStreamMessage[],
    runId?: string,
  ): {
      output: MessageObject[];
      usage?: RunUsage;
    } {
    const allBlocks: MessageContentBlock[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let hasUsage = false;

    for (const msg of messages) {
      if (msg.message) {
        allBlocks.push(...MessageConverter.toContentBlocks(msg.message));
      }
      if (msg.usage) {
        hasUsage = true;
        promptTokens += msg.usage.promptTokens ?? 0;
        completionTokens += msg.usage.completionTokens ?? 0;
      }
    }

    const consolidated = MessageConverter.consolidateContentBlocks(allBlocks);

    const output: MessageObject[] = consolidated.length > 0
      ? [{
        id: newMsgId(),
        object: AgentObjectType.ThreadMessage,
        createdAt: nowUnix(),
        runId,
        role: MessageRole.Assistant,
        status: MessageStatus.Completed,
        content: consolidated,
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
