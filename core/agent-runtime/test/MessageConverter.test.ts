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
    it('should merge chunks into single MessageObject and accumulate usage', () => {
      const messages: AgentStreamMessage[] = [
        { message: { content: 'chunk1' }, usage: { promptTokens: 10, completionTokens: 5 } },
        { message: { content: 'chunk2' }, usage: { promptTokens: 0, completionTokens: 8 } },
      ];
      const { output, usage } = MessageConverter.extractFromStreamMessages(messages, 'run_1');

      assert.equal(output.length, 1);
      assert.equal(output[0].content.length, 1);
      assert(isTextBlock(output[0].content[0]));
      assert.equal(output[0].content[0].text.value, 'chunk1chunk2');
      assert.equal(output[0].runId, 'run_1');
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

    it('should skip messages with accumulate=false', () => {
      const messages: AgentStreamMessage[] = [
        { message: { content: 'thinking...' }, accumulate: false },
        { message: { content: 'visible text' }, accumulate: true },
        { message: { content: 'tool delta' }, accumulate: false },
      ];
      const { output } = MessageConverter.extractFromStreamMessages(messages, 'run_1');
      assert.equal(output.length, 1);
      assert.equal(output[0].content.length, 1);
      assert(isTextBlock(output[0].content[0]));
      assert.equal(output[0].content[0].text.value, 'visible text');
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

  describe('normalizeContentBlocks', () => {
    it('should convert content_block_start[tool_use] to ToolUseContentBlock', () => {
      const blocks = [
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: {} } },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 1);
      assert(isToolUseBlock(result[0]));
      assert.equal(result[0].id, 'toolu_1');
      assert.equal(result[0].name, 'Bash');
      assert.deepStrictEqual(result[0].input, {});
    });

    it('should convert content_block_delta[input_json_delta] to TextContentBlock', () => {
      const blocks = [
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"command":' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '"ls -la"}' } },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 2);
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, '{"command":');
      assert(isTextBlock(result[1]));
      assert.equal(result[1].text.value, '"ls -la"}');
    });

    it('should convert content_block_delta[text_delta] to TextContentBlock', () => {
      const blocks = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 1);
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'Hello');
    });

    it('should discard content_block_start for non-tool_use types (thinking, text)', () => {
      const blocks = [
        { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
        { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 0);
    });

    it('should discard thinking_delta and signature_delta blocks', () => {
      const blocks = [
        { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'let me think...' } },
        { type: 'content_block_delta', delta: { type: 'signature_delta', signature: 'sig-theta' } },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 0);
    });

    it('should discard content_block_stop, message_stop, message_delta', () => {
      const blocks = [
        { type: 'content_block_stop' },
        { type: 'message_stop' },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 0);
    });

    it('should keep standard content blocks as-is', () => {
      const blocks = [
        { type: ContentBlockType.Text, text: { value: 'hello', annotations: [] } },
        { type: ContentBlockType.ToolUse, id: 'toolu_1', name: 'search', input: { q: 'test' } },
        { type: ContentBlockType.ToolResult, tool_use_id: 'toolu_1', content: 'result' },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 3);
      assert(isTextBlock(result[0]));
      assert(isToolUseBlock(result[1]));
      assert(isToolResultBlock(result[2]));
    });

    it('should skip empty input_json_delta and text_delta', () => {
      const blocks = [
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: '' } },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 0);
    });

    it('should handle realistic Anthropic stream: tool_use start + input deltas + stop + tool_result', () => {
      const blocks = [
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: {} } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"command":' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '"ls -la"}' } },
        { type: 'content_block_stop' },
        { type: ContentBlockType.ToolResult, tool_use_id: 'toolu_1', content: 'file1\nfile2' },
      ] as any;
      const result = MessageConverter.normalizeContentBlocks(blocks);
      assert.equal(result.length, 4);
      assert(isToolUseBlock(result[0]));
      assert.equal(result[0].name, 'Bash');
      assert(isTextBlock(result[1]));
      assert.equal(result[1].text.value, '{"command":');
      assert(isTextBlock(result[2]));
      assert.equal(result[2].text.value, '"ls -la"}');
      assert(isToolResultBlock(result[3]));
    });
  });

  describe('mergeContentBlocks', () => {
    it('should return empty array for empty input', () => {
      assert.deepStrictEqual(MessageConverter.mergeContentBlocks([]), []);
    });

    it('should merge consecutive text blocks into one', () => {
      const blocks = [
        { type: ContentBlockType.Text, text: { value: 'Hello', annotations: [] } },
        { type: ContentBlockType.Text, text: { value: ' ', annotations: [] } },
        { type: ContentBlockType.Text, text: { value: 'world', annotations: [] } },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 1);
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'Hello world');
    });

    it('should not merge text blocks separated by non-text blocks', () => {
      const blocks = [
        { type: ContentBlockType.Text, text: { value: 'before', annotations: [] } },
        { type: ContentBlockType.ToolResult, tool_use_id: 'toolu_1', content: 'result' },
        { type: ContentBlockType.Text, text: { value: 'after', annotations: [] } },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 3);
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'before');
      assert(isToolResultBlock(result[1]));
      assert(isTextBlock(result[2]));
      assert.equal(result[2].text.value, 'after');
    });

    it('should backfill tool_use input from subsequent text blocks', () => {
      const blocks = [
        { type: ContentBlockType.ToolUse, id: 'toolu_1', name: 'search', input: {} },
        { type: ContentBlockType.Text, text: { value: '{"command":', annotations: [] } },
        { type: ContentBlockType.Text, text: { value: ' "curl -s"}', annotations: [] } },
        { type: ContentBlockType.ToolResult, tool_use_id: 'toolu_1', content: 'ok' },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 2);
      assert(isToolUseBlock(result[0]));
      assert.deepStrictEqual(result[0].input, { command: 'curl -s' });
      assert(isToolResultBlock(result[1]));
    });

    it('should keep tool_use as-is when no text blocks follow', () => {
      const blocks = [
        { type: ContentBlockType.ToolUse, id: 'toolu_1', name: 'search', input: { q: 'test' } },
        { type: ContentBlockType.ToolResult, tool_use_id: 'toolu_1', content: 'result' },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 2);
      assert(isToolUseBlock(result[0]));
      assert.deepStrictEqual(result[0].input, { q: 'test' });
    });

    it('should fallback to empty object when JSON parse fails', () => {
      const blocks = [
        { type: ContentBlockType.ToolUse, id: 'toolu_1', name: 'search', input: {} },
        { type: ContentBlockType.Text, text: { value: 'not valid json', annotations: [] } },
        { type: ContentBlockType.ToolResult, tool_use_id: 'toolu_1', content: 'result' },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 2);
      assert(isToolUseBlock(result[0]));
      assert.deepStrictEqual(result[0].input, {});
    });

    it('should handle realistic stream scenario: text + tool_use + input deltas + tool_result + text', () => {
      const blocks = [
        { type: ContentBlockType.Text, text: { value: 'I will ', annotations: [] } },
        { type: ContentBlockType.Text, text: { value: 'help you.', annotations: [] } },
        { type: ContentBlockType.ToolUse, id: 'fc-1', name: 'Bash', input: {} },
        { type: ContentBlockType.Text, text: { value: '{"command":"ls -la"}', annotations: [] } },
        { type: ContentBlockType.ToolResult, tool_use_id: 'fc-1', content: 'file1\nfile2' },
        { type: ContentBlockType.Text, text: { value: 'Here are', annotations: [] } },
        { type: ContentBlockType.Text, text: { value: ' the results.', annotations: [] } },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 4);
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'I will help you.');
      assert(isToolUseBlock(result[1]));
      assert.deepStrictEqual(result[1].input, { command: 'ls -la' });
      assert(isToolResultBlock(result[2]));
      assert(isTextBlock(result[3]));
      assert.equal(result[3].text.value, 'Here are the results.');
    });

    it('should pass through generic blocks unchanged', () => {
      const blocks = [
        { type: 'thinking', thinking: 'let me think...' },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'thinking');
      assert.equal((result[0] as any).thinking, 'let me think...');
    });

    it('should handle raw Anthropic SDK stream events end-to-end', () => {
      const blocks = [
        // text deltas
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'I will ' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'help you.' } },
        { type: 'content_block_stop' },
        // thinking (should be discarded)
        { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'let me think...' } },
        // tool_use start + input deltas + stop
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'fc-1', name: 'Bash', input: {} } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"command":' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '"ls -la"}' } },
        { type: 'content_block_stop' },
        // tool_result (already standard block)
        { type: ContentBlockType.ToolResult, tool_use_id: 'fc-1', content: 'file1\nfile2' },
        // more text deltas
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Here are' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ' the results.' } },
        // message_stop (should be discarded)
        { type: 'message_stop' },
      ] as any;
      const result = MessageConverter.mergeContentBlocks(blocks);
      assert.equal(result.length, 4);
      // merged text
      assert(isTextBlock(result[0]));
      assert.equal(result[0].text.value, 'I will help you.');
      // tool_use with parsed input
      assert(isToolUseBlock(result[1]));
      assert.equal(result[1].name, 'Bash');
      assert.deepStrictEqual(result[1].input, { command: 'ls -la' });
      // tool_result
      assert(isToolResultBlock(result[2]));
      assert.equal(result[2].tool_use_id, 'fc-1');
      // merged trailing text
      assert(isTextBlock(result[3]));
      assert.equal(result[3].text.value, 'Here are the results.');
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
