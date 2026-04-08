import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

import {
  RunStatus,
  AgentObjectType,
  MessageRole,
  MessageStatus,
  ContentBlockType,
  AgentNotFoundError, AgentConflictError } from '@eggjs/tegg-types/agent-runtime';

import { isTextBlock } from '../src/MessageConverter';
import type { RunRecord, CreateRunInput, AgentStreamMessage, StreamEvent } from '@eggjs/tegg-types/agent-runtime';

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

async function waitForRunStatus(
  agentStore: OSSAgentStore,
  runId: string,
  expectedStatus: RunStatus,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const run = await agentStore.getRun(runId);
    if (run.status === expectedStatus) return;
    await setTimeout(10);
  }
  throw new Error(`Run ${runId} did not reach status '${expectedStatus}' within ${timeoutMs}ms`);
}

function createSlowExecRun(chunks: AgentStreamMessage[], onYielded?: () => void): AgentExecutor['execRun'] {
  return async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage> {
    for (const chunk of chunks) {
      yield chunk;
    }
    onYielded?.();
    await new Promise<void>((resolve, reject) => {
      const timer = globalThis.setTimeout(resolve, 5000);
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('aborted'));
          },
          { once: true },
        );
      }
    });
  };
}

function createBlockingExecRun(
  resolveRef: { resolve?: () => void },
  chunks: AgentStreamMessage[],
): AgentExecutor['execRun'] {
  return async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage> {
    await new Promise<void>((resolve, reject) => {
      resolveRef.resolve = resolve;
      if (signal) {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }
    });
    for (const chunk of chunks) {
      yield chunk;
    }
  };
}

describe('test/AgentRuntime.test.ts', () => {
  let runtime: AgentRuntime;
  let store: OSSAgentStore;
  let executor: AgentExecutor;

  beforeEach(() => {
    store = new OSSAgentStore({ client: new MapStorageClient() });
    executor = {
      async* execRun(input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
        const messages = input.input.messages;
        yield {
          message: {
            role: MessageRole.Assistant,
            content: [{ type: 'text', text: `Hello ${messages.length} messages` }],
          },
        };
        yield {
          usage: { promptTokens: 10, completionTokens: 5 },
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
    it('should create a thread and return ThreadObject', async () => {
      const result = await runtime.createThread();
      assert(result.id.startsWith('thread_'));
      assert.equal(result.object, AgentObjectType.Thread);
      assert(typeof result.createdAt === 'number');
      // Unix seconds
      assert(result.createdAt <= Math.floor(Date.now() / 1000));
      assert(typeof result.metadata === 'object');
    });
  });

  describe('getThread', () => {
    it('should get a thread by id', async () => {
      const created = await runtime.createThread();

      const result = await runtime.getThread(created.id);
      assert.equal(result.id, created.id);
      assert.equal(result.object, AgentObjectType.Thread);
      assert(Array.isArray(result.messages));
    });

    it('should throw AgentNotFoundError for non-existent thread', async () => {
      await assert.rejects(
        () => runtime.getThread('thread_xxx'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          return true;
        },
      );
    });
  });

  describe('syncRun', () => {
    it('should collect all chunks and return completed RunObject', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, AgentObjectType.ThreadRun);
      assert.equal(result.status, RunStatus.Completed);
      assert(result.threadId);
      assert(result.threadId.startsWith('thread_'));
      assert.equal(result.output!.length, 1);
      assert.equal(result.output![0].object, AgentObjectType.ThreadMessage);
      assert.equal(result.output![0].role, MessageRole.Assistant);
      assert.equal(result.output![0].status, MessageStatus.Completed);
      const content = result.output![0].content;
      assert.equal(content[0].type, ContentBlockType.Text);
      assert(isTextBlock(content[0]));
      assert.equal(content[0].text.value, 'Hello 1 messages');
      assert(Array.isArray(content[0].text.annotations));
      assert.equal(result.usage!.promptTokens, 10);
      assert.equal(result.usage!.completionTokens, 5);
      assert.equal(result.usage!.totalTokens, 15);
      assert(result.startedAt! >= result.createdAt, 'startedAt should be >= createdAt');
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { user_id: 'u_1', trace: 'xyz' };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepStrictEqual(result.metadata, meta);

      const run = await store.getRun(result.id);
      assert.deepStrictEqual(run.metadata, meta);
    });

    it('should store the run in the store', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Completed);
      assert(run.completedAt);
    });

    it('should append messages to thread when threadId provided', async () => {
      const thread = await runtime.createThread();

      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2);
      assert.equal(updated.messages[0].role, MessageRole.User);
      assert.equal(updated.messages[1].role, MessageRole.Assistant);
    });

    it('should auto-create thread and append messages when threadId not provided', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.threadId);
      assert(result.threadId.startsWith('thread_'));

      const thread = await runtime.getThread(result.threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].role, MessageRole.User);
      assert.equal(thread.messages[1].role, MessageRole.Assistant);
    });

    it('should set isResume=false when no threadId provided (auto-create)', async () => {
      let capturedInput: CreateRunInput | undefined;
      executor.execRun = async function* (input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
        capturedInput = input;
        yield { message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'hi' }] } };
      };

      await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert.equal(capturedInput!.isResume, false);
    });

    it('should set isResume=false when threadId provided but thread has no messages', async () => {
      let capturedInput: CreateRunInput | undefined;
      executor.execRun = async function* (input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
        capturedInput = input;
        yield { message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'hi' }] } };
      };

      const thread = await runtime.createThread();
      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert.equal(capturedInput!.isResume, false);
    });

    it('should set isResume=true when threadId provided and thread has messages', async () => {
      let capturedInput: CreateRunInput | undefined;
      executor.execRun = async function* (input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
        capturedInput = input;
        yield { message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'hi' }] } };
      };

      // First run creates thread with messages
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // Second run on the same thread — now it has history
      await runtime.syncRun({
        threadId: result.threadId,
        input: { messages: [{ role: 'user', content: 'Hello again' }] },
      });
      assert.equal(capturedInput!.isResume, true);
    });

    it('should not throw when store.updateRun fails in catch block', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        throw new Error('exec failed');
      };

      let callCount = 0;
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('store down');
        }
        return origUpdateRun(runId, updates);
      };

      await assert.rejects(
        () => runtime.syncRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }),
        (err: unknown) => {
          assert(err instanceof Error);
          assert.equal(err.message, 'exec failed');
          return true;
        },
      );
    });
  });

  describe('asyncRun', () => {
    it('should return queued status immediately with auto-created threadId', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, AgentObjectType.ThreadRun);
      assert.equal(result.status, RunStatus.Queued);
      assert(result.threadId);
      assert(result.threadId.startsWith('thread_'));
    });

    it('should complete the run in the background', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Completed);
      const outputContent = run.output![0].content;
      assert(isTextBlock(outputContent[0]));
      assert.equal(outputContent[0].text.value, 'Hello 1 messages');
    });

    it('should auto-create thread and append messages when threadId not provided', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.threadId);

      await runtime.waitForPendingTasks();

      const thread = await store.getThread(result.threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].role, MessageRole.User);
      assert.equal(thread.messages[1].role, MessageRole.Assistant);
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { session: 'sess_1' };
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepStrictEqual(result.metadata, meta);

      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.deepStrictEqual(run.metadata, meta);
    });
  });

  describe('streamRun', () => {
    it('should emit StreamEvent sequence: run_created, message events, done', async () => {
      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventTypes = writer.events.map(e => e.event);
      assert(eventTypes.includes('run_created'), 'should have run_created event');
      assert(eventTypes.includes('message'), 'should have message event');
      assert(eventTypes.includes('done'), 'should have done event');
      assert(writer.closed, 'writer should be closed');

      // Verify order: run_created comes first, done comes last
      const createdIdx = eventTypes.indexOf('run_created');
      const doneIdx = eventTypes.indexOf('done');
      assert(createdIdx === 0, 'run_created should be first');
      assert(doneIdx === eventTypes.length - 1, 'done should be last');

      // Verify StreamEvent format: { seq, type, data, ts }
      for (const ev of writer.events) {
        const streamEvent = ev.data as StreamEvent;
        assert(typeof streamEvent.seq === 'number', 'seq should be a number');
        assert(typeof streamEvent.type === 'string', 'type should be a string');
        assert(typeof streamEvent.ts === 'number', 'ts should be a number');
        assert('data' in streamEvent, 'should have data field');
      }

      // Verify sequential seq numbers
      const seqs = writer.events.map(e => (e.data as StreamEvent).seq);
      for (let i = 1; i < seqs.length; i++) {
        assert(seqs[i] === seqs[i - 1] + 1, `seq should be sequential: ${seqs[i]} after ${seqs[i - 1]}`);
      }

      // Verify run_created data has runId and threadId
      const runCreatedEvent = writer.events[0].data as StreamEvent;
      assert((runCreatedEvent.data as any).runId, 'run_created should have runId');
      assert((runCreatedEvent.data as any).threadId, 'run_created should have threadId');

      // Verify messages persisted to thread
      const threadId = (runCreatedEvent.data as any).threadId;
      const thread = await runtime.getThread(threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].role, MessageRole.User);
      assert.equal(thread.messages[1].role, MessageRole.Assistant);
    });

    it('should continue background execution on client disconnect', async () => {
      let resolveYielded!: () => void;
      const yieldedPromise = new Promise<void>(r => {
        resolveYielded = r;
      });

      executor.execRun = async function* (
        _input: CreateRunInput,
        signal?: AbortSignal,
      ): AsyncGenerator<AgentStreamMessage> {
        yield { message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'start' }] } };
        resolveYielded();
        // Simulate more work after client disconnects
        await setTimeout(50);
        if (!signal?.aborted) {
          yield { message: { role: MessageRole.Assistant, content: [{ type: 'text', text: ' end' }] } };
        }
      };

      const writer = new MockSSEWriter();
      const streamPromise = runtime.streamRun(
        { input: { messages: [{ role: 'user', content: 'Hi' }] } },
        writer,
      );

      // Wait for first chunk to be yielded, then give the writer time to receive it
      await yieldedPromise;
      await setTimeout(50);
      writer.simulateClose();
      await streamPromise;

      // Writer should have received at least run_created before disconnect
      assert(writer.events.length >= 1, 'should have at least run_created event');

      // Background task should complete — wait for it
      await runtime.waitForPendingTasks();

      // Verify the run completed in the store (not cancelled)
      const runCreatedEvent = writer.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const run = await runtime.getRun(runId);
      assert.equal(run.status, RunStatus.Completed, 'run should complete despite client disconnect');
    });

    it('should forward custom event types from AgentStreamMessage.type', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        yield { type: 'system', raw: { type: 'system', subtype: 'init', session_id: 'sess-1' } };
        yield { type: 'stream_event', raw: { type: 'stream_event', event: { type: 'content_block_delta' } } };
        yield { message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'Hello' }] } };
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventTypes = writer.events.map(e => e.event);
      assert(eventTypes.includes('system'), 'should forward system event');
      assert(eventTypes.includes('stream_event'), 'should forward stream_event');
      assert(eventTypes.includes('message'), 'should forward message event (no type → "message")');
    });

    it('should use raw field as event data when provided', async () => {
      const rawMsg = { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'raw hello' }] } };
      executor.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        yield { type: 'assistant', raw: rawMsg, message: { content: 'Hello' } };
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const assistantEvent = writer.events.find(e => e.event === 'assistant');
      assert.ok(assistantEvent);
      const streamEvent = assistantEvent.data as StreamEvent;
      assert.deepStrictEqual(streamEvent.data, rawMsg, 'should use raw field as data');
    });

    it('should construct event data from message fields when raw is not provided', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        yield {
          type: 'custom_event',
          message: { content: 'hello' },
          usage: { promptTokens: 10, completionTokens: 5 },
        };
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const customEvent = writer.events.find(e => e.event === 'custom_event');
      assert.ok(customEvent);
      const streamEvent = customEvent.data as StreamEvent;
      const data = streamEvent.data as any;
      assert.equal(data.type, 'custom_event');
      assert.deepStrictEqual(data.message, { content: 'hello' });
      assert.deepStrictEqual(data.usage, { promptTokens: 10, completionTokens: 5 });
    });

    it('should skip keepalive messages from event buffer', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        yield { type: 'keepalive' };
        yield { message: { content: 'Hello' } };
        yield { type: 'keepalive' };
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventTypes = writer.events.map(e => e.event);
      assert(!eventTypes.includes('keepalive'), 'keepalive should not be in buffered events');
      assert(eventTypes.includes('message'), 'message should be present');
    });

    it('should emit error event when execRun throws', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        throw new Error('model unavailable');
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const errorEvent = writer.events.find(e => e.event === 'error');
      assert.ok(errorEvent, 'should have error event');
      const streamEvent = errorEvent.data as StreamEvent;
      assert.equal((streamEvent.data as any).message, 'model unavailable');
      assert(writer.closed);

      // Verify run is marked as failed in store
      const runCreatedEvent = writer.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const run = await runtime.getRun(runId);
      assert.equal(run.status, RunStatus.Failed);
    });

    it('should persist usage to store on completion', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        yield { message: { content: 'Hi' }, usage: { promptTokens: 10, completionTokens: 5 } };
        yield { usage: { promptTokens: 0, completionTokens: 3 } };
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const runCreatedEvent = writer.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const run = await runtime.getRun(runId);
      assert.equal(run.status, RunStatus.Completed);
      assert.equal(run.usage!.promptTokens, 10);
      assert.equal(run.usage!.completionTokens, 8);
      assert.equal(run.usage!.totalTokens, 18);
    });
  });

  describe('reconnectStream', () => {
    it('should replay all events on reconnect with lastEventId=0', async () => {
      const writer1 = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer1);

      // Get runId from the first event
      const runCreatedEvent = writer1.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;

      // Reconnect and get all events
      const writer2 = new MockSSEWriter();
      await runtime.reconnectStream(runId, writer2, 0);

      // Should get the same events
      assert.equal(writer2.events.length, writer1.events.length);
      for (let i = 0; i < writer1.events.length; i++) {
        const se1 = writer1.events[i].data as StreamEvent;
        const se2 = writer2.events[i].data as StreamEvent;
        assert.equal(se1.seq, se2.seq);
        assert.equal(se1.type, se2.type);
      }
    });

    it('should replay only events after lastEventId', async () => {
      const writer1 = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer1);

      const runCreatedEvent = writer1.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const totalEvents = writer1.events.length;

      // Reconnect from seq 2 (skip first 2 events)
      const writer2 = new MockSSEWriter();
      await runtime.reconnectStream(runId, writer2, 2);

      assert.equal(writer2.events.length, totalEvents - 2);
      const firstReplayedSeq = (writer2.events[0].data as StreamEvent).seq;
      assert.equal(firstReplayedSeq, 3);
    });

    it('should throw AgentNotFoundError for unknown runId', async () => {
      const writer = new MockSSEWriter();
      await assert.rejects(
        () => runtime.reconnectStream('run_nonexistent', writer),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          return true;
        },
      );
    });

    it('should stream real-time events during reconnect to running task', async () => {
      let resolveExec!: () => void;
      const execPromise = new Promise<void>(r => {
        resolveExec = r;
      });

      executor.execRun = async function* (
        _input: CreateRunInput,
        signal?: AbortSignal,
      ): AsyncGenerator<AgentStreamMessage> {
        yield { message: { content: 'chunk1' } };
        // Wait for reconnect to happen
        await execPromise;
        if (!signal?.aborted) {
          yield { message: { content: 'chunk2' } };
        }
      };

      // Start streaming and disconnect immediately after first events
      const writer1 = new MockSSEWriter();
      const streamPromise = runtime.streamRun(
        { input: { messages: [{ role: 'user', content: 'Hi' }] } },
        writer1,
      );

      // Wait a bit for the first chunk to be buffered
      await setTimeout(50);
      writer1.simulateClose();
      await streamPromise;

      const runId = ((writer1.events[0].data as StreamEvent).data as any).runId;

      // Reconnect — should get replayed events then real-time
      const writer2 = new MockSSEWriter();
      const reconnectPromise = runtime.reconnectStream(runId, writer2, 0);

      // Let the background task continue
      await setTimeout(20);
      resolveExec();

      await runtime.waitForPendingTasks();
      // Give streamEventsToWriter time to process the final events
      await setTimeout(20);

      // Close writer2 to end reconnect
      writer2.simulateClose();
      await reconnectPromise;

      // writer2 should have received all events including chunk2 and done
      const eventTypes = writer2.events.map(e => e.event);
      assert(eventTypes.includes('done'), 'reconnected stream should receive done event');
    });
  });

  describe('getRun', () => {
    it('should get a run by id', async () => {
      const syncResult = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      const result = await runtime.getRun(syncResult.id);
      assert.equal(result.id, syncResult.id);
      assert.equal(result.object, AgentObjectType.ThreadRun);
      assert.equal(result.status, RunStatus.Completed);
      assert(typeof result.createdAt === 'number');
    });

    it('should return metadata from getRun', async () => {
      const meta = { source: 'api' };
      const syncResult = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });

      const result = await runtime.getRun(syncResult.id);
      assert.deepStrictEqual(result.metadata, meta);
    });
  });

  describe('cancelRun', () => {
    it('should cancel a run', async () => {
      executor.execRun = createSlowExecRun([
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'start' }] },
        },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      const cancelResult = await runtime.cancelRun(result.id);
      assert.equal(cancelResult.id, result.id);
      assert.equal(cancelResult.object, AgentObjectType.ThreadRun);
      assert.equal(cancelResult.status, RunStatus.Cancelled);

      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Cancelled);
      assert(run.cancelledAt);
    });

    it('should write cancelling then cancelled to store', async () => {
      executor.execRun = createSlowExecRun([
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'start' }] },
        },
      ]);

      const statusHistory: string[] = [];
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        if (updates.status) {
          statusHistory.push(updates.status);
        }
        return origUpdateRun(runId, updates);
      };

      const asyncResult = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hello' }] },
      });

      await waitForRunStatus(store, asyncResult.id, RunStatus.InProgress);
      statusHistory.length = 0;

      await runtime.cancelRun(asyncResult.id);

      const cancellingIdx = statusHistory.indexOf(RunStatus.Cancelling);
      const cancelledIdx = statusHistory.indexOf(RunStatus.Cancelled);
      assert(cancellingIdx >= 0, 'cancelling should have been written');
      assert(cancelledIdx > cancellingIdx, 'cancelled should come after cancelling');
    });

    it('should throw AgentConflictError when cancelling a completed run', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert.equal(result.status, RunStatus.Completed);

      await assert.rejects(
        () => runtime.cancelRun(result.id),
        (err: unknown) => {
          assert(err instanceof AgentConflictError);
          return true;
        },
      );
    });

    it('should not overwrite cancelling status with completed (cross-worker scenario)', async () => {
      const resolveRef: { resolve?: () => void } = {};
      executor.execRun = createBlockingExecRun(resolveRef, [
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'done' }] },
        },
        {
          usage: { promptTokens: 1, completionTokens: 1 },
        },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      await store.updateRun(result.id, { status: RunStatus.Cancelling });

      resolveRef.resolve!();
      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Cancelling);
    });

    it('should not overwrite terminal state when run completes during cancellation (TOCTOU)', async () => {
      const resolveRef: { resolve?: () => void } = {};
      executor.execRun = createBlockingExecRun(resolveRef, [
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'done' }] },
        },
        { usage: { promptTokens: 1, completionTokens: 1 } },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        await origUpdateRun(runId, updates);
        if (updates.status === RunStatus.Cancelling) {
          await origUpdateRun(runId, { status: RunStatus.Completed, completedAt: Math.floor(Date.now() / 1000) });
          store.updateRun = origUpdateRun;
        }
      };

      resolveRef.resolve!();

      const cancelResult = await runtime.cancelRun(result.id);
      assert.equal(cancelResult.status, RunStatus.Completed);
    });
  });
});
