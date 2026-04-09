import assert from 'node:assert';

import type { AgentMessage } from '@eggjs/tegg-types/agent-runtime';

import { AgentNotFoundError, OSSAgentStore } from '../index';
import { MapStorageClient, MapStorageClientWithoutAppend } from './helpers';

describe('test/OSSAgentStore.test.ts', () => {
  let store: OSSAgentStore;

  beforeEach(() => {
    store = new OSSAgentStore({ client: new MapStorageClient() });
  });

  describe('threads', () => {
    it('should create a thread', async () => {
      const thread = await store.createThread();
      assert(thread.id.startsWith('thread_'));
      assert.equal(thread.object, 'thread');
      assert(Array.isArray(thread.messages));
      assert.equal(thread.messages.length, 0);
      assert(typeof thread.createdAt === 'number');
      assert(thread.createdAt <= Math.floor(Date.now() / 1000));
    });

    it('should create a thread with metadata', async () => {
      const thread = await store.createThread({ key: 'value' });
      assert.deepEqual(thread.metadata, { key: 'value' });
    });

    it('should create a thread with empty metadata by default', async () => {
      const thread = await store.createThread();
      assert.deepEqual(thread.metadata, {});
    });

    it('should get a thread by id', async () => {
      const created = await store.createThread();
      const fetched = await store.getThread(created.id);
      assert.equal(fetched.id, created.id);
      assert.equal(fetched.object, 'thread');
      assert.equal(fetched.createdAt, created.createdAt);
    });

    it('should return empty messages for a new thread', async () => {
      const thread = await store.createThread();
      const fetched = await store.getThread(thread.id);
      assert.deepEqual(fetched.messages, []);
    });

    it('should throw AgentNotFoundError for non-existent thread', async () => {
      await assert.rejects(
        () => store.getThread('thread_non_existent'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          assert.match(err.message, /Thread thread_non_existent not found/);
          return true;
        },
      );
    });

    it('should append messages to a thread', async () => {
      const thread = await store.createThread();
      const messages: AgentMessage[] = [
        { type: 'user', message: { role: 'user', content: 'Hello' } },
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] } },
      ];
      await store.appendMessages(thread.id, messages);
      const fetched = await store.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });

    it('should append messages incrementally', async () => {
      const thread = await store.createThread();
      await store.appendMessages(thread.id, [
        { type: 'user', message: { role: 'user', content: 'First' } },
      ]);
      await store.appendMessages(thread.id, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Second' }] } },
      ]);
      const fetched = await store.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });

    it('should throw AgentNotFoundError when appending to non-existent thread', async () => {
      await assert.rejects(
        () =>
          store.appendMessages('thread_non_existent', [
            { type: 'user', message: { role: 'user', content: 'Hello' } },
          ]),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          return true;
        },
      );
    });

    it('should only return user and assistant messages by default', async () => {
      const thread = await store.createThread();
      await store.appendMessages(thread.id, [
        { type: 'system', subtype: 'init', session_id: 'sess-1' },
        { type: 'user', message: { role: 'user', content: 'Hello' } },
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] } },
        { type: 'result', subtype: 'success', usage: { input_tokens: 10, output_tokens: 5 } },
      ]);
      const fetched = await store.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });

    it('should return all message types when includeAllMessages is true', async () => {
      const thread = await store.createThread();
      await store.appendMessages(thread.id, [
        { type: 'system', subtype: 'init', session_id: 'sess-1' },
        { type: 'user', message: { role: 'user', content: 'Hello' } },
        { type: 'result', subtype: 'success', usage: { input_tokens: 10, output_tokens: 5 } },
      ]);
      const fetched = await store.getThread(thread.id, { includeAllMessages: true });
      assert.equal(fetched.messages.length, 3);
      assert.equal(fetched.messages[0].type, 'system');
      assert.equal(fetched.messages[1].type, 'user');
      assert.equal(fetched.messages[2].type, 'result');
    });
  });

  describe('threads (without append)', () => {
    it('should fall back to get-concat-put when client has no append', async () => {
      const fallbackStore = new OSSAgentStore({ client: new MapStorageClientWithoutAppend() });
      const thread = await fallbackStore.createThread();
      await fallbackStore.appendMessages(thread.id, [
        { type: 'user', message: { role: 'user', content: 'Hello' } },
      ]);
      await fallbackStore.appendMessages(thread.id, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] } },
      ]);
      const fetched = await fallbackStore.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });
  });

  describe('runs', () => {
    it('should create a run', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      assert(run.id.startsWith('run_'));
      assert.equal(run.object, 'thread.run');
      assert.equal(run.status, 'queued');
      assert.equal(run.input.length, 1);
      assert(typeof run.createdAt === 'number');
      assert(run.createdAt <= Math.floor(Date.now() / 1000));
    });

    it('should create a run with threadId and config', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], 'thread_123', { timeoutMs: 5000 });
      assert.equal(run.threadId, 'thread_123');
      assert.deepEqual(run.config, { timeoutMs: 5000 });
    });

    it('should create a run with metadata', async () => {
      const meta = { user_id: 'u_1', session: 'abc' };
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], 'thread_123', undefined, meta);
      assert.deepEqual(run.metadata, meta);

      const fetched = await store.getRun(run.id);
      assert.deepEqual(fetched.metadata, meta);
    });

    it('should preserve metadata across updateRun', async () => {
      const meta = { tag: 'test' };
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], undefined, undefined, meta);
      await store.updateRun(run.id, { status: 'in_progress', startedAt: Math.floor(Date.now() / 1000) });
      const fetched = await store.getRun(run.id);
      assert.equal(fetched.status, 'in_progress');
      assert.deepEqual(fetched.metadata, meta);
    });

    it('should get a run by id', async () => {
      const created = await store.createRun([{ role: 'user', content: 'Hello' }]);
      const fetched = await store.getRun(created.id);
      assert.equal(fetched.id, created.id);
      assert.equal(fetched.status, 'queued');
    });

    it('should throw AgentNotFoundError for non-existent run', async () => {
      await assert.rejects(
        () => store.getRun('run_non_existent'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          assert.match(err.message, /Run run_non_existent not found/);
          return true;
        },
      );
    });

    it('should update a run', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      await store.updateRun(run.id, {
        status: 'completed',
        completedAt: Math.floor(Date.now() / 1000),
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
      const fetched = await store.getRun(run.id);
      assert.equal(fetched.status, 'completed');
      assert(typeof fetched.completedAt === 'number');
      assert.deepStrictEqual(fetched.usage, { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    });

    it('should not allow overwriting id or object via updateRun', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      await store.updateRun(run.id, {
        id: 'run_hacked',
        object: 'thread' as never,
        status: 'completed',
      });
      const fetched = await store.getRun(run.id);
      assert.equal(fetched.id, run.id);
      assert.equal(fetched.object, 'thread.run');
      assert.equal(fetched.status, 'completed');
    });
  });

  describe('init / destroy', () => {
    it('should call client init when present', async () => {
      let initCalled = false;
      const client = new MapStorageClient();
      client.init = async () => { initCalled = true; };
      const s = new OSSAgentStore({ client });
      await s.init();
      assert.equal(initCalled, true);
    });

    it('should call client destroy when present', async () => {
      let destroyCalled = false;
      const client = new MapStorageClient();
      client.destroy = async () => { destroyCalled = true; };
      const s = new OSSAgentStore({ client });
      await s.destroy();
      assert.equal(destroyCalled, true);
    });

    it('should not throw when client has no init/destroy', async () => {
      const s = new OSSAgentStore({ client: new MapStorageClient() });
      await s.init();
      await s.destroy();
    });
  });

  describe('prefix', () => {
    it('should use prefix in storage keys', async () => {
      const client = new MapStorageClient();
      const prefixedStore = new OSSAgentStore({ client, prefix: 'myapp/' });

      const thread = await prefixedStore.createThread();
      // Verify we can get it back (proves the prefix is used consistently)
      const fetched = await prefixedStore.getThread(thread.id);
      assert.equal(fetched.id, thread.id);

      const run = await prefixedStore.createRun([{ role: 'user', content: 'Hello' }]);
      const fetchedRun = await prefixedStore.getRun(run.id);
      assert.equal(fetchedRun.id, run.id);
    });

    it('should normalize prefix without trailing slash', async () => {
      const client = new MapStorageClient();
      const withSlash = new OSSAgentStore({ client, prefix: 'myapp/' });
      const withoutSlash = new OSSAgentStore({ client, prefix: 'myapp' });

      // Both stores should write to the same keys
      const thread = await withSlash.createThread();
      const fetched = await withoutSlash.getThread(thread.id);
      assert.equal(fetched.id, thread.id);
    });

    it('should isolate data between different prefixes', async () => {
      const client = new MapStorageClient();
      const store1 = new OSSAgentStore({ client, prefix: 'app1/' });
      const store2 = new OSSAgentStore({ client, prefix: 'app2/' });

      const thread = await store1.createThread();
      await assert.rejects(
        () => store2.getThread(thread.id),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          return true;
        },
      );
    });
  });
});
