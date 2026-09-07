import assert from 'node:assert';

import type { AgentMessage, CreateRunInput, RuntimeMessage } from '@eggjs/tegg-types/agent-runtime';
import {
  isRuntimeMessage,
  hasRuntimeMessageProtocol,
  runtimeMessageViolation,
  RUNTIME_MESSAGE_PROTOCOL,
  AgentTimeoutError,
  RunStatus,
} from '@eggjs/tegg-types/agent-runtime';

import { AgentRuntime } from '../src/AgentRuntime';
import type { AgentExecutor } from '../src/AgentRuntime';
import { OSSAgentStore } from '../src/OSSAgentStore';
import type { SSEWriter } from '../src/SSEWriter';
import { MapStorageClient } from './helpers';

/**
 * The V2 executor contract: `execRun` yields self-describing `RuntimeMessage`
 * envelopes, so the runtime never inspects a vendor's message shape.
 *
 * These tests deliberately use payloads that look nothing like Claude messages —
 * if any assertion here passed by accident through a Claude-shaped heuristic,
 * that would be the bug worth catching.
 */

class CaptureWriter implements SSEWriter {
  events: Array<{ event: string; data: unknown }> = [];
  closed = false;
  writeEvent(event: string, data: unknown): void {
    this.events.push({ event, data });
  }
  writeComment(): void { /* noop */ }
  end(): void {
    this.closed = true;
  }
  onClose(): void { /* noop */ }
}

const silentLogger = {
  info() { /* noop */ }, warn() { /* noop */ },
  error() { /* noop */ }, debug() { /* noop */ },
} as any;

/** Stamp the protocol brand, so the tests read as the executor would write them. */
function v2(msg: Omit<RuntimeMessage, 'protocol'>): RuntimeMessage {
  return { protocol: RUNTIME_MESSAGE_PROTOCOL, ...msg };
}

/** A Pi/Codex-flavoured stream: nothing here carries a Claude `type` field. */
function v2Turn(): RuntimeMessage[] {
  return [
    v2({ eventType: 'start', persistence: 'transient', payload: { kind: 'start', sessionRef: 'pi-1' } }),
    v2({ eventType: 'text-delta', persistence: 'transient', payload: { kind: 'text-delta', delta: 'he' } }),
    v2({ eventType: 'text-delta', persistence: 'transient', payload: { kind: 'text-delta', delta: 'llo' } }),
    v2({
      eventType: 'message',
      persistence: 'durable',
      sessionCommitted: true,
      payload: { role: 'assistant', parts: [{ type: 'text', text: 'hello' }] },
    }),
    v2({
      eventType: 'finish',
      persistence: 'durable',
      conversational: false,
      usage: { promptTokens: 7, completionTokens: 3, totalTokens: 10 },
      payload: { kind: 'finish', reason: 'stop' },
    }),
  ];
}

function execRunOf(messages: Array<RuntimeMessage | AgentMessage>): AgentExecutor['execRun'] {
  return async function* (): AsyncGenerator<RuntimeMessage | AgentMessage> {
    for (const m of messages) yield m;
  };
}

async function runV2(messages: Array<RuntimeMessage | AgentMessage>) {
  const store = new OSSAgentStore({ client: new MapStorageClient(), prefix: 'v2' });
  const runtime = new AgentRuntime({
    executor: { execRun: execRunOf(messages) },
    store: store as any,
    logger: silentLogger,
  });
  const thread = await runtime.createThread();
  const writer = new CaptureWriter();
  await runtime.streamRun({
    threadId: thread.id,
    input: { messages: [{ role: 'user' as const, content: 'hi' }] },
  } as CreateRunInput, writer);
  const stored = await store.getThread(thread.id, { includeAllMessages: true });
  const visible = await store.getThread(thread.id);
  const runId = await store.getLatestRunId(thread.id);
  return { writer, stored, visible, run: runId ? await store.getRun(runId) : undefined };
}

/** Drop the runtime's bookkeeping namespace to compare the payload itself. */
function withoutEggExt(msg: unknown): unknown {
  if (!msg || typeof msg !== 'object') return msg;
  const rest = { ...(msg as Record<string, unknown>) };
  delete rest.eggExt;
  return rest;
}

describe('AgentRuntime V2 contract', () => {
  describe('isRuntimeMessage', () => {
    it('recognises a V2 envelope', () => {
      assert.ok(isRuntimeMessage(v2({ eventType: 'x', persistence: 'durable', payload: {} })));
    });

    it('rejects a Claude-shaped message, so V1 payloads never take the V2 path', () => {
      assert.ok(!isRuntimeMessage({ type: 'assistant', message: {} }));
      assert.ok(!isRuntimeMessage({ type: 'stream_event', event: {} }));
    });

    it('rejects a V1 message that happens to carry V2-shaped fields', () => {
      // `AgentMessage` permits arbitrary extra fields, so a structural check alone
      // would misroute this one and silently change how it streams and persists.
      assert.ok(!isRuntimeMessage({
        type: 'assistant',
        message: {},
        eventType: 'assistant',
        persistence: 'durable',
        payload: { role: 'assistant' },
      }));
    });

    it('rejects a payload that is not a plain object', () => {
      // Durable payloads are persisted as JSONL records and annotated with
      // bookkeeping fields under `eggExt`. Storage copies them with object
      // spread, which reduces anything exotic to its own enumerable keys —
      // `{...new Date()}` is `{}`, `{...[1,2]}` is `{0:1,1:2}` — so accepting
      // these would mean silently discarding the message's contents.
      class Custom { constructor(public v = 1) {} }
      const rejected: unknown[] = [
        'hello', 42, null, undefined, true,
        [ 1, 2, 3 ], [],
        new Date(), new Map([[ 'a', 1 ]]), new Set([ 1 ]), new Custom(),
      ];
      for (const payload of rejected) {
        assert.ok(
          !isRuntimeMessage({ protocol: RUNTIME_MESSAGE_PROTOCOL, eventType: 'x', persistence: 'durable', payload }),
          `payload ${Object.prototype.toString.call(payload)} must not be accepted`,
        );
      }
      // A null-prototype object is still plain JSON data, so it is accepted.
      assert.ok(isRuntimeMessage({
        protocol: RUNTIME_MESSAGE_PROTOCOL, eventType: 'x', persistence: 'durable',
        payload: Object.assign(Object.create(null), { a: 1 }),
      }));
    });

    it('names the offending field so an executor can be fixed', () => {
      const base = { protocol: RUNTIME_MESSAGE_PROTOCOL, eventType: 'x', persistence: 'durable', payload: {} };
      assert.match(runtimeMessageViolation({ ...base, eventType: '' })!, /eventType/);
      assert.match(runtimeMessageViolation({ ...base, persistence: 'maybe' })!, /persistence/);
      assert.match(runtimeMessageViolation({ ...base, payload: 'raw' })!, /payload/);
      assert.strictEqual(runtimeMessageViolation(base), undefined);
    });

    it('separates claiming the brand from being well-formed', () => {
      // Routing must not depend on validity, or a malformed V2 envelope would
      // quietly become a V1 message.
      const malformed = { protocol: RUNTIME_MESSAGE_PROTOCOL, eventType: 'x', persistence: 'durable', payload: 'raw' };
      assert.ok(hasRuntimeMessageProtocol(malformed), 'still claims to be V2');
      assert.ok(!isRuntimeMessage(malformed), 'but is not a valid V2 envelope');
      assert.ok(!hasRuntimeMessageProtocol({ type: 'assistant', message: {} }), 'V1 makes no such claim');
    });

    it('rejects malformed or non-object values', () => {
      assert.ok(!isRuntimeMessage(null));
      assert.ok(!isRuntimeMessage('x'));
      assert.ok(!isRuntimeMessage({ eventType: 'x' }));
      assert.ok(!isRuntimeMessage({ protocol: RUNTIME_MESSAGE_PROTOCOL, eventType: 'x', persistence: 'maybe', payload: {} }));
      // right shape, wrong (or absent) brand
      assert.ok(!isRuntimeMessage({ eventType: 'x', persistence: 'durable', payload: {} }));
      assert.ok(!isRuntimeMessage({ protocol: 'agent-runtime/v3', eventType: 'x', persistence: 'durable', payload: {} }));
    });
  });

  describe('persistence is taken from the envelope', () => {
    it('persists only the messages declared durable', async () => {
      const { stored } = await runV2(v2Turn());
      // input message + the two durable envelopes; the three transient ones are dropped
      assert.strictEqual(stored.messages.length, 3);
      const payloads = stored.messages.slice(1).map(withoutEggExt);
      assert.deepStrictEqual(payloads[0], { role: 'assistant', parts: [{ type: 'text', text: 'hello' }] });
      assert.deepStrictEqual(payloads[1], { kind: 'finish', reason: 'stop' });
    });

    it('stores the payload verbatim — the framework does not reshape it', async () => {
      const { stored } = await runV2([
        v2({ eventType: 'x', persistence: 'durable', payload: { anything: [ 1, 2, { deep: true }] } }),
      ]);
      assert.deepStrictEqual(withoutEggExt(stored.messages[1]), { anything: [ 1, 2, { deep: true }] });
    });

    it('persists the same payload object once per yield', async () => {
      // Positional bookkeeping, not identity: yielding one object twice produces
      // two records. (Under the contract that object is not edited in between —
      // see the mutation test below for what happens when it is.)
      const shared = { role: 'assistant', text: 'tick' };
      const { stored } = await runV2([
        v2({ eventType: 'message', persistence: 'durable', payload: shared }),
        v2({ eventType: 'message', persistence: 'durable', payload: shared }),
      ]);
      assert.strictEqual(stored.messages.length, 3, 'input + both yields');
      assert.deepStrictEqual(withoutEggExt(stored.messages[1]), shared);
      assert.deepStrictEqual(withoutEggExt(stored.messages[2]), shared);
    });

    it('rewrites earlier records when a payload is mutated after being yielded', async () => {
      // Pins the documented consequence of violating "do not mutate after yield":
      // the runtime holds the payload by reference until the turn is persisted,
      // and persistence is gated on commit — so an edit between yields reaches
      // back into records the SSE stream has already emitted with the old value.
      // V1 `AgentMessage`s behave identically; this is a contract, not a bug to
      // be discovered later.
      const shared: Record<string, unknown> = { text: 'a', nested: { n: 1 } };
      const store = new OSSAgentStore({ client: new MapStorageClient(), prefix: 'v2-mutate' });
      const runtime = new AgentRuntime({
        executor: {
          async* execRun() {
            yield v2({ eventType: 'message', persistence: 'durable', payload: shared });
            shared.text = 'b';
            (shared.nested as { n: number }).n = 2;
            // Commit only now, so neither record has been flushed yet.
            yield v2({ eventType: 'message', persistence: 'durable', sessionCommitted: true, payload: shared });
          },
        },
        store: store as any,
        logger: silentLogger,
      });
      const thread = await runtime.createThread();
      const writer = new CaptureWriter();
      await runtime.streamRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user' as const, content: 'hi' }] },
      } as CreateRunInput, writer);

      const stored = await store.getThread(thread.id, { includeAllMessages: true });
      const texts = stored.messages.slice(1).map(m => (m as any).text);
      assert.deepStrictEqual(texts, [ 'b', 'b' ], 'both records carry the final value');
      const nested = stored.messages.slice(1).map(m => (m as any).nested.n);
      assert.deepStrictEqual(nested, [ 2, 2 ], 'nested edits propagate too');
      await runtime.destroy();
    });
  });

  describe('SSE event names come from eventType', () => {
    it('forwards every message, using the declared name', async () => {
      const { writer } = await runV2(v2Turn());
      const names = writer.events.map(e => e.event);
      assert.deepStrictEqual(names, [
        'run_created', 'start', 'text-delta', 'text-delta', 'message', 'finish', 'done',
      ]);
    });

    it('puts the payload in the envelope data, untouched', async () => {
      const { writer } = await runV2(v2Turn());
      const delta = writer.events.find(e => e.event === 'text-delta');
      // writeEvent receives the whole { seq, type, data, ts } envelope
      const envelope = delta!.data as { type: string; data: any };
      assert.strictEqual(envelope.type, 'text-delta');
      assert.deepStrictEqual(envelope.data, { kind: 'text-delta', delta: 'he' });
    });
  });

  describe('usage comes from the envelope', () => {
    it('records usage declared on a message, with no Claude-shaped result present', async () => {
      const { run } = await runV2(v2Turn());
      assert.deepStrictEqual(run?.usage, { promptTokens: 7, completionTokens: 3, totalTokens: 10 });
    });

    it('leaves usage unset when no message declares it', async () => {
      const { run } = await runV2([
        v2({ eventType: 'message', persistence: 'durable', payload: { role: 'assistant' } }),
      ]);
      assert.ok(run?.usage === undefined || run?.usage === null);
    });

    it('does not mine numbers out of a V2 payload that looks Claude-shaped', async () => {
      // A provider whose native events happen to use `type: 'result'` must not
      // have usage invented for it: the payload is opaque by contract.
      const { run } = await runV2([
        v2({
          eventType: 'finish',
          persistence: 'durable',
          payload: {
            type: 'result',
            subtype: 'success',
            usage: { input_tokens: 999, output_tokens: 999 },
            duration_api_ms: 4321,
          },
        }),
      ]);
      assert.ok(run?.usage === undefined || run?.usage === null, 'usage must stay undeclared');
      assert.ok(run?.apiDurationMs === undefined || run?.apiDurationMs === null);
    });
  });

  describe('conversational is honoured on read', () => {
    it('hides a durable message declared non-conversational from the default thread view', async () => {
      const { stored, visible } = await runV2(v2Turn());
      assert.strictEqual(stored.messages.length, 3, 'all durable records are on disk');
      // `finish` declared conversational: false, so only input + assistant show
      assert.strictEqual(visible.messages.length, 2);
      assert.deepStrictEqual(
        withoutEggExt(visible.messages[1]),
        { role: 'assistant', parts: [{ type: 'text', text: 'hello' }] },
      );
    });

    it('defaults a durable V2 message to conversational', async () => {
      const { visible } = await runV2([
        v2({ eventType: 'message', persistence: 'durable', payload: { role: 'assistant', text: 'hi' } }),
      ]);
      assert.strictEqual(visible.messages.length, 2, 'input + the assistant record');
    });

    it('keeps the V1 type rule for messages with no declaration', async () => {
      const { visible } = await runV2([
        { type: 'assistant', message: { role: 'assistant', content: [] } } as AgentMessage,
        { type: 'result', subtype: 'success' } as unknown as AgentMessage,
      ]);
      // `result` is durable under V1 but not conversational, exactly as before
      assert.strictEqual(visible.messages.length, 2);
    });
  });

  describe('sessionCommitted gates cancellation', () => {
    it('flips the run to committed without an isSessionCommitted callback', async () => {
      // A committed run persists its transcript; an uncommitted one would not.
      const { stored } = await runV2([
        v2({ eventType: 'message', persistence: 'durable', sessionCommitted: true, payload: { role: 'assistant' } }),
      ]);
      assert.ok(stored.messages.length > 0, 'committed run should persist its transcript');
    });

    it('does not treat a V2 message as committed just because it is not a Claude system message', async () => {
      // V1's fallback is `msg.type !== 'system'`. A V2 payload has no `type`, so
      // that heuristic would commit on the very first progress event — before the
      // provider had written anything recoverable to its own session.
      const store = new OSSAgentStore({ client: new MapStorageClient(), prefix: 'v2-cancel' });
      const runtime = new AgentRuntime({
        executor: {
          // Emits, then stalls until aborted — the shape of a real provider
          // still waiting on the model when the user cancels.
          async* execRun(_input, signal) {
            yield v2({ eventType: 'start', persistence: 'transient', payload: { kind: 'start' } });
            yield v2({ eventType: 'progress', persistence: 'durable', payload: { kind: 'progress' } });
            await new Promise<void>(resolve => {
              if (signal?.aborted) return resolve();
              signal?.addEventListener('abort', () => resolve(), { once: true });
            });
          },
        },
        store: store as any,
        logger: silentLogger,
        cancelCommitTimeoutMs: 50,
      });
      try {
        const thread = await runtime.createThread();
        const run = await runtime.asyncRun({
          threadId: thread.id,
          input: { messages: [{ role: 'user' as const, content: 'hi' }] },
        } as CreateRunInput);
        // Let the executor emit both messages before cancelling.
        await new Promise(resolve => setTimeout(resolve, 20));

        await assert.rejects(
          () => runtime.cancelRun(run.id),
          (err: unknown) => err instanceof AgentTimeoutError,
          'cancel must wait for an explicit sessionCommitted, then time out',
        );
        assert.strictEqual((await store.getRun(run.id)).status, RunStatus.Failed);
        // Nothing was declared committed, so the thread is left untouched.
        const stored = await store.getThread(thread.id, { includeAllMessages: true });
        assert.strictEqual(stored.messages.length, 0);
      } finally {
        await runtime.destroy();
      }
    });
  });

  describe('mixed streams', () => {
    it('accepts V1 messages alongside V2 envelopes, adapting each on its own terms', async () => {
      // Lets an existing executor migrate message by message rather than all at once.
      const { stored, writer } = await runV2([
        { type: 'stream_event', event: { type: 'content_block_delta' } } as unknown as AgentMessage,
        { type: 'assistant', message: { role: 'assistant', content: [] } } as AgentMessage,
        v2({ eventType: 'finish', persistence: 'durable', payload: { kind: 'finish' } }),
      ]);
      // stream_event stays transient by V1 rules; assistant and the V2 envelope persist
      assert.strictEqual(stored.messages.length, 3);
      const names = writer.events.map(e => e.event);
      assert.deepStrictEqual(names, [ 'run_created', 'stream_event', 'assistant', 'finish', 'done' ]);
    });

    it('still uses the V1 extractor for usage when the stream mixes both', async () => {
      const { run } = await runV2([
        v2({ eventType: 'progress', persistence: 'transient', payload: { kind: 'progress' } }),
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 11, output_tokens: 4 },
        } as unknown as AgentMessage,
      ]);
      assert.strictEqual(run?.usage?.promptTokens, 11);
      assert.strictEqual(run?.usage?.completionTokens, 4);
    });

    it('fails the run on a branded but malformed envelope rather than treating it as V1', async () => {
      // A JS caller can defeat the compile-time `payload` guarantee. Falling
      // through to the V1 branch would be worse than failing: with no `type` the
      // envelope would be renamed `message`, persisted in place of its payload,
      // and — since `undefined !== 'system'` — marked committed on the spot,
      // silently defeating V2's cancel-safety guarantee.
      const { writer, run } = await runV2([
        { protocol: RUNTIME_MESSAGE_PROTOCOL, eventType: 'x', persistence: 'durable', payload: 'raw' } as unknown as AgentMessage,
        v2({ eventType: 'message', persistence: 'durable', payload: { role: 'assistant', text: 'never reached' } }),
      ]);
      assert.strictEqual(run?.status, RunStatus.Failed);
      const error = writer.events.find(e => e.event === 'error');
      assert.ok(error, 'the failure must surface on the stream');
      assert.match(String((error!.data as any).data.message), /invalid RuntimeMessage/);
      assert.ok(!writer.events.some(e => e.event === 'x'), 'the malformed envelope must not stream as a V1 message');
    });
  });

  describe('storage bookkeeping is attributable', () => {
    it('stamps the protocol alongside the conversational declaration', async () => {
      const { stored } = await runV2([
        v2({ eventType: 'message', persistence: 'durable', conversational: false, payload: { role: 'x' } }),
      ]);
      const ext = (stored.messages[1] as any).eggExt;
      assert.strictEqual(ext.runtimeProtocol, RUNTIME_MESSAGE_PROTOCOL);
      assert.strictEqual(ext.conversational, false);
    });

    it('ignores a bare conversational field on a V1 record', async () => {
      // A V1 executor may already use `conversational` as its own eggExt field.
      // Without the protocol stamp it is not a V2 declaration, so the V1 `type`
      // rule must still decide and existing history must read as it always did.
      const { visible, stored } = await runV2([
        {
          type: 'assistant',
          message: { role: 'assistant', content: [] },
          eggExt: { conversational: false },
        } as unknown as AgentMessage,
        { type: 'result', subtype: 'success', eggExt: { conversational: true } } as unknown as AgentMessage,
      ]);
      assert.strictEqual(stored.messages.length, 3, 'both V1 records persist');
      // assistant stays visible despite `false`; result stays hidden despite `true`
      assert.strictEqual(visible.messages.length, 2);
      assert.strictEqual((visible.messages[1] as any).type, 'assistant');
    });
  });
});
