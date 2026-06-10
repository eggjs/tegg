import assert from 'node:assert';

import type { AgentMessage, CreateRunInput, StreamEvent } from '@eggjs/tegg-types/agent-runtime';
import { AgentObjectType, RunStatus } from '@eggjs/tegg-types/agent-runtime';

import { AgentRuntime } from '../src/AgentRuntime';
import type { AgentExecutor, AgentRuntimeOptions } from '../src/AgentRuntime';
import { OSSAgentStore } from '../src/OSSAgentStore';
import type { SSEWriter } from '../src/SSEWriter';
import { MapStorageClient } from './helpers';

class MockSSEWriter implements SSEWriter {
  events: Array<{ event: string; data: unknown }> = [];
  comments: string[] = [];
  closed = false;
  private closeCallbacks: Array<() => void> = [];

  writeEvent(event: string, data: unknown): void {
    this.events.push({ event, data });
  }

  writeComment(text: string): void {
    this.comments.push(text);
  }

  end(): void {
    this.closed = true;
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  simulateClose(): void {
    this.closed = true;
    for (const cb of this.closeCallbacks) cb();
  }
}

describe('test/AgentRuntime.metadata.test.ts', () => {
  let runtime: AgentRuntime;
  let store: OSSAgentStore;
  let client: MapStorageClient;
  let executor: AgentExecutor;

  beforeEach(() => {
    client = new MapStorageClient();
    store = new OSSAgentStore({ client });
    executor = {
      async* execRun(input: CreateRunInput): AsyncGenerator<AgentMessage> {
        const messages = input.input.messages;
        yield {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: `Hello ${messages.length} messages` }],
          },
        };
      },
    };
    runtime = new AgentRuntime({
      executor,
      store,
      logger: {
        error() {
          /* noop */
        },
      } as unknown as AgentRuntimeOptions['logger'],
    });
  });

  afterEach(async () => {
    await runtime.destroy();
  });

  describe('createThread', () => {
    it('should accept metadata and persist it on the thread record', async () => {
      const meta = { agentName: 'foo', traceId: 't-1' };
      const result = await runtime.createThread({ metadata: meta });
      assert.equal(result.object, AgentObjectType.Thread);
      assert.deepStrictEqual(result.metadata, meta);

      const stored = await store.getThread(result.id);
      assert.deepStrictEqual(stored.metadata, meta);
    });

    it('should default to empty metadata when not provided', async () => {
      const result = await runtime.createThread();
      assert.deepStrictEqual(result.metadata, {});
    });
  });

  describe('syncRun metadata handling', () => {
    it('should initialize an auto-created thread with threadMetadata', async () => {
      const threadMetadata = {
        bizId: 'order_123',
        nested: { source: 'customer_service' },
        tags: [ 'vip', 7 ],
        enabled: true,
        nullable: null,
      };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        threadMetadata,
      });

      const thread = await store.getThread(result.threadId);
      assert.deepStrictEqual(thread.metadata, threadMetadata);
    });

    it('should shallow-merge threadMetadata into an existing thread', async () => {
      const thread = await runtime.createThread({
        metadata: {
          bizId: 'order_123',
          source: 'customer_service',
          nested: { old: true },
        },
      });

      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        threadMetadata: {
          source: 'operator_console',
          nested: { replacement: true },
        },
      });

      const stored = await store.getThread(thread.id);
      assert.deepStrictEqual(stored.metadata, {
        bizId: 'order_123',
        source: 'operator_console',
        nested: { replacement: true },
      });
    });

    it('should leave existing thread metadata unchanged when threadMetadata is empty or omitted', async () => {
      const original = { bizId: 'order_123', source: 'customer_service' };
      const thread = await runtime.createThread({ metadata: original });

      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'First' }] },
        threadMetadata: {},
      });
      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Second' }] },
      });

      assert.deepStrictEqual((await store.getThread(thread.id)).metadata, original);
    });

    it('should reject invalid threadMetadata before creating a thread', async () => {
      const assertInvalid = async (invalid: unknown): Promise<void> => {
        await assert.rejects(
          () => runtime.syncRun({
            input: { messages: [{ role: 'user', content: 'Hi' }] },
            threadMetadata: invalid,
          } as unknown as CreateRunInput),
          (err: unknown) => {
            assert.equal((err as { status?: number }).status, 400);
            assert.match((err as Error).message, /threadMetadata/);
            return true;
          },
        );
      };

      for (const invalid of [ null, [], 'invalid', 1, true ]) {
        await assertInvalid(invalid);
      }
      assert.deepStrictEqual(client.keysWithPrefix('threads/'), []);
      assert.deepStrictEqual(client.keysWithPrefix('runs/'), []);
    });

    it('should keep input.metadata on the run and not copy it to an auto-created thread', async () => {
      const meta = { agentName: 'bar', sandboxId: 's-42' };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });

      assert.deepStrictEqual(result.metadata, meta);
      assert.equal(result.status, RunStatus.Completed);

      const thread = await store.getThread(result.threadId);
      assert.deepStrictEqual(thread.metadata, {});
    });

    it('should NOT overwrite metadata of an existing thread (resume path)', async () => {
      const original = { agentName: 'orig', createdBy: 'user-1' };
      const thread = await runtime.createThread({ metadata: original });

      const result = await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: { agentName: 'OVERRIDE' },
      });

      assert.equal(result.threadId, thread.id);

      const stored = await store.getThread(thread.id);
      assert.deepStrictEqual(stored.metadata, original);
    });
  });

  describe('asyncRun metadata handling', () => {
    it('should persist threadMetadata on the thread', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        threadMetadata: { bizId: 'async_123' },
      });
      await runtime.waitForPendingTasks();

      const thread = await store.getThread(result.threadId);
      assert.deepStrictEqual(thread.metadata, { bizId: 'async_123' });
    });

    it('should keep input.metadata on the run and not copy it to an auto-created thread', async () => {
      const meta = { agentName: 'baz' };
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      await runtime.waitForPendingTasks();

      assert.deepStrictEqual(result.metadata, meta);
      const thread = await store.getThread(result.threadId);
      assert.deepStrictEqual(thread.metadata, {});
    });
  });

  describe('streamRun metadata handling', () => {
    it('should persist threadMetadata on the thread', async () => {
      const writer = new MockSSEWriter();

      await runtime.streamRun(
        {
          input: { messages: [{ role: 'user', content: 'Hi' }] },
          threadMetadata: { bizId: 'stream_123' },
        },
        writer,
      );

      const runCreatedEvent = writer.events.find(e => e.event === 'run_created')!.data as StreamEvent;
      const threadId = (runCreatedEvent.data as { threadId: string }).threadId;
      assert.deepStrictEqual((await store.getThread(threadId)).metadata, { bizId: 'stream_123' });
    });

    it('should keep input.metadata on the run and not copy it to an auto-created thread', async () => {
      const meta = { agentName: 'stream', source: 'sse' };
      const writer = new MockSSEWriter();

      await runtime.streamRun(
        {
          input: { messages: [{ role: 'user', content: 'Hi' }] },
          metadata: meta,
        },
        writer,
      );

      const runCreatedEvent = writer.events.find(e => e.event === 'run_created')!.data as StreamEvent;
      const runId = (runCreatedEvent.data as { runId: string }).runId;
      const threadId = (runCreatedEvent.data as { threadId: string }).threadId;
      const run = await store.getRun(runId);

      assert.deepStrictEqual(run.metadata, meta);
      const thread = await store.getThread(threadId);
      assert.deepStrictEqual(thread.metadata, {});
    });
  });
});
