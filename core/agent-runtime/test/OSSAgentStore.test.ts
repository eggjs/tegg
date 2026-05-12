import assert from 'node:assert';

import type { AgentMessage } from '@eggjs/tegg-types/agent-runtime';

import {
  AgentNotFoundError,
  OSSAgentStore,
  TS_MAX_MS,
  decodeReverseMs,
  reverseMs,
} from '../index';
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

  describe('thread time index', () => {
    // Drive Date.now() to a fixed millisecond value for the duration of `fn`,
    // then restore the real clock — used so we can predict the index key bytes.
    function withFixedNow<T>(ms: number, fn: () => Promise<T>): Promise<T> {
      const realNow = Date.now;
      Date.now = () => ms;
      return Promise.resolve()
        .then(fn)
        .finally(() => {
          Date.now = realNow;
        });
    }

    // The shape every fully-prefixed (`agent/`) time-index key should match:
    // `agent/index/threads-by-date/<YYYY-MM-DD>/<13-digit-revMs>_<thread_<uuid>>`.
    const INDEX_KEY_RE_AGENT = /^agent\/index\/threads-by-date\/\d{4}-\d{2}-\d{2}\/\d{13}_thread_[0-9a-f-]+$/;
    // Same shape but allowing any prefix segment (including the empty prefix).
    const INDEX_KEY_RE_ANY = /^(?:[^/]+(?:\/[^/]+)*\/)?index\/threads-by-date\/\d{4}-\d{2}-\d{2}\/\d{13}_thread_[0-9a-f-]+$/;

    // Three sample wall-clock instants we use repeatedly. All Date.UTC arguments
    // are zero-indexed in the month slot (so 10 means November).
    const T_EARLY = Date.UTC(2025, 10, 13, 8, 0, 0, 0); //  2025-11-13T08:00:00.000Z = 1763020800000 ms
    const T_MID = Date.UTC(2025, 10, 13, 8, 0, 1, 234); //  2025-11-13T08:00:01.234Z = 1763020801234 ms
    const T_LATE = Date.UTC(2025, 10, 13, 10, 0, 0, 0); //  2025-11-13T10:00:00.000Z = 1763028000000 ms

    it('writes a sidecar time index next to meta.json on createThread', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const thread = await withFixedNow(T_MID, () => localStore.createThread({ user: 'alice' }));
      await localStore.awaitPendingWrites();

      const keys = client.keys();
      assert.ok(
        keys.includes(`agent/threads/${thread.id}/meta.json`),
        `meta.json not found amongst keys: ${JSON.stringify(keys)}`,
      );

      const indexKeys = client.keysWithPrefix('agent/index/threads-by-date/');
      assert.equal(indexKeys.length, 1, `expected exactly one index entry, got ${JSON.stringify(indexKeys)}`);
      const indexKey = indexKeys[0];
      assert.match(indexKey, INDEX_KEY_RE_AGENT);

      const expectedRev = reverseMs(T_MID);
      const expectedKey = `agent/index/threads-by-date/2025-11-13/${expectedRev}_${thread.id}`;
      assert.equal(indexKey, expectedKey);

      // The suffix is a faithful encoding: decoding it recovers the original ms.
      const fileName = indexKey.slice(indexKey.lastIndexOf('/') + 1);
      const decoded = decodeReverseMs(fileName.slice(0, fileName.indexOf('_')));
      assert.equal(decoded, T_MID);
      // TS_MAX_MS export is the operand the encoder used.
      assert.equal(parseInt(fileName.slice(0, fileName.indexOf('_')), 10), TS_MAX_MS - T_MID);
    });

    it('the index body carries threadId, Unix-second createdAt and a snapshot of metadata', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });
      const meta: Record<string, unknown> = { user: 'alice', channel: 'web' };

      const thread = await withFixedNow(T_MID, () => localStore.createThread(meta));
      await localStore.awaitPendingWrites();

      const indexKey = client.keysWithPrefix('agent/index/threads-by-date/')[0];
      const raw = await client.get(indexKey);
      assert.ok(raw, 'index body should be present after drain');
      const body = JSON.parse(raw) as { threadId: string; createdAt: number; metadata: Record<string, unknown> };

      assert.deepStrictEqual(body, {
        threadId: thread.id,
        createdAt: Math.floor(T_MID / 1000),
        metadata: { user: 'alice', channel: 'web' },
      });
      // The body's createdAt is the same Unix-second value as the thread record's,
      // because both derive from a single Date.now() reading.
      assert.strictEqual(body.createdAt, thread.createdAt);

      // The body is a JSON snapshot taken at write time — mutating the original
      // metadata object after the fact must not be reflected in the persisted
      // body, since the OSSAgentStore wrote a serialized copy.
      meta.user = 'mutated';
      const reread = JSON.parse((await client.get(indexKey))!) as typeof body;
      assert.equal(reread.metadata.user, 'alice');
    });

    it('within a date directory, ASC dictionary order equals time-DESC creation order', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const early = await withFixedNow(T_EARLY, () => localStore.createThread({ tag: 'early' }));
      const mid = await withFixedNow(T_MID, () => localStore.createThread({ tag: 'mid' }));
      const late = await withFixedNow(T_LATE, () => localStore.createThread({ tag: 'late' }));
      await localStore.awaitPendingWrites();

      // keysWithPrefix returns the array already sorted ASCII-ascending, which
      // is also how an OSS ListObjects would return the keys.
      const indexKeys = client.keysWithPrefix('agent/index/threads-by-date/2025-11-13/');
      assert.equal(indexKeys.length, 3);

      const threadIdsInListOrder = indexKeys.map(k => {
        const fileName = k.slice(k.lastIndexOf('/') + 1);
        return fileName.slice(fileName.indexOf('_') + 1);
      });
      // Newest first because the suffix is the time complement.
      assert.deepStrictEqual(threadIdsInListOrder, [ late.id, mid.id, early.id ]);

      const revs = indexKeys.map(k => {
        const fileName = k.slice(k.lastIndexOf('/') + 1);
        return fileName.slice(0, fileName.indexOf('_'));
      });
      assert.deepStrictEqual(revs, [ reverseMs(T_LATE), reverseMs(T_MID), reverseMs(T_EARLY) ]);
      assert.ok(revs[0] < revs[1] && revs[1] < revs[2], 'revs must be ASCII-ascending');
    });

    it('threads created on either side of a UTC day boundary land in different date buckets', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const lastMsOfNov13Utc = Date.UTC(2025, 10, 13, 23, 59, 59, 999);
      const firstMsOfNov14Utc = Date.UTC(2025, 10, 14, 0, 0, 0, 0);

      const earlier = await withFixedNow(lastMsOfNov13Utc, () => localStore.createThread());
      const later = await withFixedNow(firstMsOfNov14Utc, () => localStore.createThread());
      await localStore.awaitPendingWrites();

      const nov13 = client.keysWithPrefix('agent/index/threads-by-date/2025-11-13/');
      const nov14 = client.keysWithPrefix('agent/index/threads-by-date/2025-11-14/');
      assert.equal(nov13.length, 1, `Nov 13 bucket: ${JSON.stringify(nov13)}`);
      assert.equal(nov14.length, 1, `Nov 14 bucket: ${JSON.stringify(nov14)}`);
      assert.ok(nov13[0].endsWith(`_${earlier.id}`));
      assert.ok(nov14[0].endsWith(`_${later.id}`));
    });

    it('honors the dateTimezone option when picking the day bucket', async () => {
      // UTC 18:00 maps to next-day 02:00 in Asia/Shanghai (UTC+8, no DST).
      const physicalMs = Date.UTC(2025, 10, 13, 18, 0, 0, 0);

      const shanghaiClient = new MapStorageClient();
      const shanghaiStore = new OSSAgentStore({
        client: shanghaiClient,
        prefix: 'agent/',
        dateTimezone: 'Asia/Shanghai',
      });
      await withFixedNow(physicalMs, () => shanghaiStore.createThread());
      await shanghaiStore.awaitPendingWrites();

      assert.equal(
        shanghaiClient.keysWithPrefix('agent/index/threads-by-date/2025-11-14/').length,
        1,
        'Shanghai store should bucket UTC 18:00 into the +08 next-day directory',
      );
      assert.equal(
        shanghaiClient.keysWithPrefix('agent/index/threads-by-date/2025-11-13/').length,
        0,
      );

      const utcClient = new MapStorageClient();
      const utcStore = new OSSAgentStore({ client: utcClient, prefix: 'agent/' });
      await withFixedNow(physicalMs, () => utcStore.createThread());
      await utcStore.awaitPendingWrites();

      assert.equal(
        utcClient.keysWithPrefix('agent/index/threads-by-date/2025-11-13/').length,
        1,
        'Default-UTC store should bucket the same instant into the same-day UTC directory',
      );
      assert.equal(
        utcClient.keysWithPrefix('agent/index/threads-by-date/2025-11-14/').length,
        0,
      );
    });

    it('createThread does not wait for the index PUT to complete (non-blocking)', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const INDEX_DELAY_MS = 120;
      client.delayPutWhenKeyMatches(/^agent\/index\/threads-by-date\//, INDEX_DELAY_MS);

      const t0 = Date.now();
      const thread = await localStore.createThread();
      const elapsedMs = Date.now() - t0;

      // The meta.json PUT against an in-memory Map resolves on the next
      // microtask, so any latency over ~10 ms here would indicate that the
      // 120 ms artificial delay on the *index* key wormed its way onto the
      // caller's await chain. A generous bound of (DELAY - 50) ms keeps the
      // assertion robust against scheduling jitter on shared CI without
      // making the assertion vacuous.
      assert.ok(
        elapsedMs < INDEX_DELAY_MS - 50,
        `createThread should return before the index PUT settles, but elapsed=${elapsedMs}ms (delay=${INDEX_DELAY_MS}ms)`,
      );

      // At this exact instant the index key is not yet visible.
      assert.equal(
        client.keysWithPrefix('agent/index/').length,
        0,
        'the slow background PUT should not be visible at the moment createThread returns',
      );

      // The meta.json is, however, already on disk.
      assert.ok(await client.get(`agent/threads/${thread.id}/meta.json`));

      // After we explicitly drain the queue, the index does land.
      await localStore.awaitPendingWrites();
      const indexKeys = client.keysWithPrefix('agent/index/threads-by-date/');
      assert.equal(indexKeys.length, 1);
      assert.ok(indexKeys[0].endsWith(`_${thread.id}`));
    });

    it('createThread succeeds even when the index PUT throws; the failure becomes a single warn line', async () => {
      const client = new MapStorageClient();
      client.failPutWhenKeyMatches(/^agent\/index\/threads-by-date\//);

      const warnCalls: unknown[][] = [];
      const logger = {
        warn(message: string, ...args: unknown[]): void {
          warnCalls.push([ message, ...args ]);
        },
      };
      const localStore = new OSSAgentStore({
        client,
        prefix: 'agent/',
        logger,
      });

      // createThread itself resolves cleanly. The injected put failure for
      // the index key is observed only as a warn line.
      const thread = await localStore.createThread({ trace: 'fail-path' });
      assert.equal(thread.object, 'thread');
      assert.match(thread.id, /^thread_[0-9a-f-]{36}$/);

      // awaitPendingWrites should also not throw — `Promise.allSettled` swallows
      // the rejection that the catch handler converted into a warn.
      await localStore.awaitPendingWrites();

      // Main data is intact.
      const metaRaw = await client.get(`agent/threads/${thread.id}/meta.json`);
      assert.ok(metaRaw, 'meta.json should still be present when only the index PUT failed');
      const metaObj = JSON.parse(metaRaw) as { id: string; createdAt: number };
      assert.equal(metaObj.id, thread.id);
      assert.equal(metaObj.createdAt, thread.createdAt);

      // No index objects were written.
      assert.equal(
        client.keysWithPrefix('agent/index/').length,
        0,
        'the simulated index PUT failure means no index entries exist',
      );

      // Exactly one warn invocation, carrying threadId / indexKey / errMessage as the trailing args.
      assert.equal(warnCalls.length, 1, `expected one warn call, got ${warnCalls.length}: ${JSON.stringify(warnCalls)}`);
      const call = warnCalls[0];
      const formatStr = call[0];
      assert.equal(typeof formatStr, 'string');
      assert.ok(
        (formatStr as string).includes('failed to write thread time index'),
        `unexpected warn format string: ${String(formatStr)}`,
      );
      assert.equal(call[1], thread.id);
      assert.match(call[2] as string, /^agent\/index\/threads-by-date\/\d{4}-\d{2}-\d{2}\/\d{13}_thread_/);
      assert.match(call[3] as string, /simulated PUT failure/);

      // And the read path keeps working — getThread does not consult the index.
      const fetched = await localStore.getThread(thread.id);
      assert.equal(fetched.id, thread.id);
    });

    it('with no logger configured, an index PUT failure falls back to console.warn without throwing', async () => {
      const client = new MapStorageClient();
      client.failPutWhenKeyMatches(/^agent\/index\/threads-by-date\//);
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      // Intercept console.warn so the suite stays quiet and we can confirm the fallback wired up.
      const realWarn = console.warn;
      const captured: unknown[][] = [];
      console.warn = ((...args: unknown[]) => {
        captured.push(args);
      }) as typeof console.warn;

      try {
        const thread = await localStore.createThread();
        await localStore.awaitPendingWrites();
        assert.equal(captured.length, 1);
        const args = captured[0];
        assert.equal(typeof args[0], 'string');
        assert.ok((args[0] as string).includes('failed to write thread time index'));
        assert.equal(args[1], thread.id);
      } finally {
        console.warn = realWarn;
      }
    });

    it('destroy() drains in-flight index writes before tearing down the underlying client', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const INDEX_DELAY_MS = 120;
      client.delayPutWhenKeyMatches(/^agent\/index\/threads-by-date\//, INDEX_DELAY_MS);

      // Capture the moment the underlying client's destroy gets called, so we
      // can sequence "drain finishes, then client.destroy fires". The base
      // MapStorageClient has no destroy method, so we attach one for this test.
      let clientDestroyCalledAt: number | null = null;
      let indexKeyVisibleAtDestroy = false;
      client.destroy = async () => {
        clientDestroyCalledAt = Date.now();
        indexKeyVisibleAtDestroy = client.keysWithPrefix('agent/index/').length > 0;
      };

      const createReturnedAt = Date.now();
      await localStore.createThread();
      // The slow PUT is still in flight.
      assert.equal(client.keysWithPrefix('agent/index/').length, 0);

      const beforeDestroy = Date.now();
      await localStore.destroy();
      const elapsedMs = Date.now() - beforeDestroy;

      // destroy waited for the 120 ms PUT to settle. Allow a small (10 ms)
      // tolerance window in case of sub-millisecond timer skew.
      assert.ok(
        elapsedMs >= INDEX_DELAY_MS - 20,
        `destroy() should wait for the in-flight index write, elapsedMs=${elapsedMs}ms delay=${INDEX_DELAY_MS}ms`,
      );

      // The underlying client.destroy was called *after* the index landed.
      // The default `assert(...)` import carries an `asserts value` type
      // predicate (whereas the namespaced `assert.notEqual` does not), so
      // it doubles as a type narrower for the timestamp variable.
      assert(clientDestroyCalledAt !== null, 'client.destroy should have been invoked');
      assert.ok(
        indexKeyVisibleAtDestroy,
        'the index entry should have been observable to client.destroy, meaning the drain ran first',
      );

      // After destroy returns, the index is fully on disk.
      assert.equal(client.keysWithPrefix('agent/index/threads-by-date/').length, 1);
      // And the timer wasn't somehow optimised away — destroy was reached
      // after the createThread call (sanity check on the captured timestamps).
      assert.ok(clientDestroyCalledAt >= createReturnedAt);
    });

    it('awaitPendingWrites() is a no-op resolved promise when there are no pending writes', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const t0 = Date.now();
      await localStore.awaitPendingWrites();
      const elapsedMs = Date.now() - t0;
      assert.ok(
        elapsedMs < 50,
        `awaitPendingWrites with an empty queue should resolve immediately, took ${elapsedMs}ms`,
      );

      // Should also be safe to call repeatedly with no in-flight writes
      // between calls.
      await localStore.awaitPendingWrites();
      await localStore.awaitPendingWrites();
    });

    it('uses the normalized prefix on the index path, including the empty-prefix case', async () => {
      // Empty prefix → index path has no leading separator.
      const bareClient = new MapStorageClient();
      const bareStore = new OSSAgentStore({ client: bareClient });
      await withFixedNow(T_MID, () => bareStore.createThread());
      await bareStore.awaitPendingWrites();
      const bareIndex = bareClient.keysWithPrefix('index/threads-by-date/');
      assert.equal(bareIndex.length, 1);
      assert.ok(!bareIndex[0].startsWith('/'), `expected no leading "/", got ${bareIndex[0]}`);
      assert.match(bareIndex[0], INDEX_KEY_RE_ANY);

      // Multi-segment prefix without trailing slash → same as the meta-key
      // normalization rule already exercised by the existing 'prefix' suite.
      const nestedClient = new MapStorageClient();
      const nestedStore = new OSSAgentStore({ client: nestedClient, prefix: 'a/b' });
      await withFixedNow(T_MID, () => nestedStore.createThread());
      await nestedStore.awaitPendingWrites();
      const nestedIndex = nestedClient.keysWithPrefix('a/b/index/threads-by-date/');
      assert.equal(nestedIndex.length, 1, `expected exactly one nested index entry: ${JSON.stringify(nestedClient.keys())}`);
      assert.match(nestedIndex[0], /^a\/b\/index\/threads-by-date\/2025-11-13\/\d{13}_thread_[0-9a-f-]+$/);

      // The threadId tail in the key matches the meta.json's id.
      const metaKey = nestedClient.keys().find(k => k.startsWith('a/b/threads/') && k.endsWith('/meta.json'));
      assert.ok(metaKey, 'meta.json key for the nested prefix should exist');
      const expectedThreadId = metaKey.slice('a/b/threads/'.length, -('/meta.json'.length));
      assert.ok(nestedIndex[0].endsWith(`_${expectedThreadId}`));
    });

    it('appendMessages, createRun, and updateRun never touch the time index after createThread', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const thread = await localStore.createThread({ origin: 'audit' });
      await localStore.awaitPendingWrites();
      const indexKeysBefore = client.keysWithPrefix('agent/index/').slice();
      const indexBodyBefore = await client.get(indexKeysBefore[0]);
      assert.equal(indexKeysBefore.length, 1, 'baseline: exactly one index entry from createThread');

      const messages: AgentMessage[] = [
        { type: 'user', message: { role: 'user', content: 'hello' } } as unknown as AgentMessage,
        {
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] },
        } as unknown as AgentMessage,
      ];
      await localStore.appendMessages(thread.id, messages);

      const run = await localStore.createRun(
        [{ role: 'user', content: 'first turn' }],
        thread.id,
        { maxIterations: 1 },
        { trace: 't' },
      );
      await localStore.updateRun(run.id, {
        status: 'completed',
        completedAt: Math.floor(Date.now() / 1000),
      });

      const indexKeysAfter = client.keysWithPrefix('agent/index/').slice();
      assert.deepStrictEqual(
        indexKeysAfter.slice().sort(),
        indexKeysBefore.slice().sort(),
        'no new index keys should appear; the index entry is the immutable thread-birth record',
      );
      const indexBodyAfter = await client.get(indexKeysAfter[0]);
      assert.equal(indexBodyAfter, indexBodyBefore, 'the index body should be byte-identical');
    });
  });
});
