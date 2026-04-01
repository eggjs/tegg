import assert from 'node:assert';

import type {
  AgentStreamMessage,
  AgentStreamMessagePayload,
  ToolUseContentBlock,
  ToolResultContentBlock,
} from '@eggjs/tegg-types/agent-runtime';
import {
  MessageRole,
  MessageStatus,
  AgentObjectType,
  ContentBlockType,
} from '@eggjs/tegg-types/agent-runtime';

import { MessageConverter, isTextBlock, isToolUseBlock, isToolResultBlock } from '../src/MessageConverter';

describe('test/MessageConverter.test.ts', () => {
  describe('toContentBlocks', () => {
    it('should return empty array for falsy payload', () => {
      const result = MessageConverter.toContentBlocks(undefined as unknown as AgentStreamMessagePayload);
      assert.deepStrictEqual(result, []);
    });

    it('should convert string content to a single text block', () => {
      const payload: AgentStreamMessagePayload = { content: 'hello world' };
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, ContentBlockType.Text);
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'hello world');
      assert.deepStrictEqual(result[0].text.annotations, []);
    });

    it('should convert array content parts to text blocks', () => {
      const payload: AgentStreamMessagePayload = {
        content: [
          { type: 'text', text: 'part1' },
          { type: 'text', text: 'part2' },
        ],
      };
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 2);
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'part1');
      assert(isTextBlock(result[1]));
      assert.equal(result[1].text.value, 'part2');
    });

    it('should preserve tool_use content parts', () => {
      const payload = {
        content: [
          { type: 'text', text: 'Let me call a tool' },
          { type: 'tool_use', id: 'toolu_123', name: 'get_weather', input: { city: 'beijing' } },
        ],
      } as unknown as AgentStreamMessagePayload;
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 2);

      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'Let me call a tool');

      assert(isToolUseBlock(result[1]));
      assert.equal(result[1].id, 'toolu_123');
      assert.equal(result[1].name, 'get_weather');
      assert.deepStrictEqual(result[1].input, { city: 'beijing' });
    });

    it('should preserve tool_result content parts', () => {
      const payload = {
        content: [
          { type: 'tool_result', tool_use_id: 'toolu_123', content: 'sunny, 25°C' },
        ],
      } as unknown as AgentStreamMessagePayload;
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 1);

      assert(isToolResultBlock(result[0]));
      assert.equal(result[0].tool_use_id, 'toolu_123');
      assert.equal(result[0].content, 'sunny, 25°C');
    });

    it('should preserve tool_result with is_error flag', () => {
      const payload = {
        content: [
          { type: 'tool_result', tool_use_id: 'toolu_456', content: 'Tool not found', is_error: true },
        ],
      } as unknown as AgentStreamMessagePayload;
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 1);

      assert(isToolResultBlock(result[0]));
      assert.equal((result[0] as ToolResultContentBlock).is_error, true);
    });

    it('should preserve unknown content types as generic blocks', () => {
      const payload = {
        content: [
          { type: 'thinking', thinking: 'let me think...' },
        ],
      } as unknown as AgentStreamMessagePayload;
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'thinking');
      assert.equal((result[0] as any).thinking, 'let me think...');
    });

    it('should preserve mixed content types in order', () => {
      const payload = {
        content: [
          { type: 'text', text: 'I will search for you' },
          { type: 'tool_use', id: 'toolu_1', name: 'search', input: { q: 'test' } },
          { type: 'text', text: 'Here are the results' },
        ],
      } as unknown as AgentStreamMessagePayload;
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 3);

      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'I will search for you');

      assert(isToolUseBlock(result[1]));
      assert.equal(result[1].name, 'search');

      assert(isTextBlock(result[2]));
      assert.equal(result[2].text.value, 'Here are the results');
    });

    it('should return empty array for non-string non-array content', () => {
      const payload = { content: 123 } as unknown as AgentStreamMessagePayload;
      const result = MessageConverter.toContentBlocks(payload);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('toMessageObject', () => {
    it('should create a completed assistant message', () => {
      const payload: AgentStreamMessagePayload = { content: 'reply' };
      const msg = MessageConverter.toMessageObject(payload, 'run_1');

      assert.ok(msg.id.startsWith('msg_'));
      assert.equal(msg.object, AgentObjectType.ThreadMessage);
      assert.equal(msg.runId, 'run_1');
      assert.equal(msg.role, MessageRole.Assistant);
      assert.equal(msg.status, MessageStatus.Completed);
      assert.equal(typeof msg.createdAt, 'number');
      const content = msg.content;
      assert.equal(content.length, 1);
      assert(isTextBlock(content[0]));
      assert.equal(content[0].text.value, 'reply');
    });

    it('should work without runId', () => {
      const payload: AgentStreamMessagePayload = { content: 'test' };
      const msg = MessageConverter.toMessageObject(payload);
      assert.equal(msg.runId, undefined);
    });

    it('should preserve tool_use blocks in message object', () => {
      const payload = {
        content: [
          { type: 'text', text: 'calling tool' },
          { type: 'tool_use', id: 'toolu_1', name: 'search', input: { q: 'test' } },
        ],
      } as unknown as AgentStreamMessagePayload;
      const msg = MessageConverter.toMessageObject(payload, 'run_1');
      assert.equal(msg.content.length, 2);
      assert(isTextBlock(msg.content[0]));
      assert(isToolUseBlock(msg.content[1]));
      assert.equal((msg.content[1] as ToolUseContentBlock).name, 'search');
    });
  });

  describe('createStreamMessage', () => {
    it('should create an in-progress message with empty content', () => {
      const msg = MessageConverter.createStreamMessage('msg_abc', 'run_1');

      assert.equal(msg.id, 'msg_abc');
      assert.equal(msg.object, AgentObjectType.ThreadMessage);
      assert.equal(msg.runId, 'run_1');
      assert.equal(msg.role, MessageRole.Assistant);
      assert.equal(msg.status, MessageStatus.InProgress);
      assert.deepStrictEqual(msg.content, []);
      assert.equal(typeof msg.createdAt, 'number');
    });
  });

  describe('extractFromStreamMessages', () => {
    it('should extract messages and accumulate usage', () => {
      const messages: AgentStreamMessage[] = [
        { message: { content: 'chunk1' }, usage: { promptTokens: 10, completionTokens: 5 } },
        { message: { content: 'chunk2' }, usage: { promptTokens: 0, completionTokens: 8 } },
      ];
      const { output, usage } = MessageConverter.extractFromStreamMessages(messages, 'run_1');

      assert.equal(output.length, 2);
      assert(isTextBlock(output[0].content[0]));
      assert.equal(output[0].content[0].text.value, 'chunk1');
      assert(isTextBlock(output[1].content[0]));
      assert.equal(output[1].content[0].text.value, 'chunk2');
      assert.ok(usage);
      assert.equal(usage.promptTokens, 10);
      assert.equal(usage.completionTokens, 13);
      assert.equal(usage.totalTokens, 23);
    });

    it('should extract messages with tool_use content', () => {
      const messages: AgentStreamMessage[] = [
        {
          message: {
            content: [
              { type: 'text', text: 'let me search' },
              { type: 'tool_use', id: 'toolu_1', name: 'search', input: { q: 'test' } },
            ] as any,
          },
        },
      ];
      const { output } = MessageConverter.extractFromStreamMessages(messages, 'run_1');
      assert.equal(output.length, 1);
      assert.equal(output[0].content.length, 2);
      assert(isTextBlock(output[0].content[0]));
      assert(isToolUseBlock(output[0].content[1]));
    });

    it('should return undefined usage when no usage info', () => {
      const messages: AgentStreamMessage[] = [{ message: { content: 'data' } }];
      const { output, usage } = MessageConverter.extractFromStreamMessages(messages);
      assert.equal(output.length, 1);
      assert.equal(usage, undefined);
    });

    it('should handle messages without message payload (usage only)', () => {
      const messages: AgentStreamMessage[] = [{ usage: { promptTokens: 5, completionTokens: 3 } }];
      const { output, usage } = MessageConverter.extractFromStreamMessages(messages);
      assert.equal(output.length, 0);
      assert.ok(usage);
      assert.equal(usage.totalTokens, 8);
    });

    it('should handle empty message array', () => {
      const { output, usage } = MessageConverter.extractFromStreamMessages([]);
      assert.equal(output.length, 0);
      assert.equal(usage, undefined);
    });
  });

  describe('toInputMessageObjects', () => {
    it('should convert user and assistant messages', () => {
      const messages = [
        { role: MessageRole.User as MessageRole, content: 'hi' },
        { role: MessageRole.Assistant as MessageRole, content: 'hello' },
      ];
      const result = MessageConverter.toInputMessageObjects(messages, 'thread_1');

      assert.equal(result.length, 2);
      assert.equal(result[0].role, MessageRole.User);
      assert.equal(result[0].threadId, 'thread_1');
      assert.equal(result[1].role, MessageRole.Assistant);

      const content0 = result[0].content;
      assert(isTextBlock(content0[0]));
      assert.equal(content0[0].text.value, 'hi');
    });

    it('should filter out system messages', () => {
      const messages = [
        { role: MessageRole.System as MessageRole, content: 'you are a bot' },
        { role: MessageRole.User as MessageRole, content: 'hi' },
      ];
      const result = MessageConverter.toInputMessageObjects(messages);
      assert.equal(result.length, 1);
      assert.equal(result[0].role, MessageRole.User);
    });

    it('should handle array content parts', () => {
      const messages = [
        {
          role: MessageRole.User as MessageRole,
          content: [
            { type: 'text' as const, text: 'part1' },
            { type: 'text' as const, text: 'part2' },
          ],
        },
      ];
      const result = MessageConverter.toInputMessageObjects(messages);
      const content = result[0].content;
      assert.equal(content.length, 2);
      assert(isTextBlock(content[0]));
      assert.equal(content[0].text.value, 'part1');
      assert(isTextBlock(content[1]));
      assert.equal(content[1].text.value, 'part2');
    });

    it('should preserve tool_use blocks in input messages', () => {
      const messages = [
        {
          role: MessageRole.Assistant as MessageRole,
          content: [
            { type: 'text', text: 'I will search for you' },
            { type: 'tool_use', id: 'toolu_1', name: 'search', input: { q: 'test' } },
          ] as any,
        },
      ];
      const result = MessageConverter.toInputMessageObjects(messages);
      assert.equal(result[0].content.length, 2);
      assert(isTextBlock(result[0].content[0]));
      assert.equal(result[0].content[0].text.value, 'I will search for you');
      assert(isToolUseBlock(result[0].content[1]));
      assert.equal((result[0].content[1] as ToolUseContentBlock).name, 'search');
    });

    it('should preserve tool_result blocks in input messages', () => {
      const messages = [
        {
          role: MessageRole.User as MessageRole,
          content: [
            { type: 'tool_result', tool_use_id: 'toolu_1', content: 'search result here' },
          ] as any,
        },
      ];
      const result = MessageConverter.toInputMessageObjects(messages);
      assert.equal(result[0].content.length, 1);
      assert(isToolResultBlock(result[0].content[0]));
      assert.equal((result[0].content[0] as ToolResultContentBlock).tool_use_id, 'toolu_1');
      assert.equal((result[0].content[0] as ToolResultContentBlock).content, 'search result here');
    });

    it('should work without threadId', () => {
      const messages = [{ role: MessageRole.User as MessageRole, content: 'hi' }];
      const result = MessageConverter.toInputMessageObjects(messages);
      assert.equal(result[0].threadId, undefined);
    });
  });

  describe('type guards', () => {
    it('isTextBlock should narrow to TextContentBlock', () => {
      const block = { type: ContentBlockType.Text, text: { value: 'hello', annotations: [] } };
      assert(isTextBlock(block));
      assert.equal(block.text.value, 'hello');
    });

    it('isToolUseBlock should narrow to ToolUseContentBlock', () => {
      const block = { type: ContentBlockType.ToolUse, id: 'toolu_1', name: 'search', input: { q: 'test' } };
      assert(isToolUseBlock(block));
      assert.equal(block.name, 'search');
    });

    it('isToolResultBlock should narrow to ToolResultContentBlock', () => {
      const block = { type: ContentBlockType.ToolResult, tool_use_id: 'toolu_1', content: 'result' };
      assert(isToolResultBlock(block));
      assert.equal(block.tool_use_id, 'toolu_1');
    });

    it('type guards should return false for non-matching blocks', () => {
      const textBlock = { type: ContentBlockType.Text, text: { value: 'hi', annotations: [] } };
      const toolUseBlock = { type: ContentBlockType.ToolUse, id: 'id', name: 'n', input: {} };

      assert(!isToolUseBlock(textBlock));
      assert(!isToolResultBlock(textBlock));
      assert(!isTextBlock(toolUseBlock));
    });
  });
});
