import type { RunUsage } from './AgentStore';

/**
 * Discriminator marking a V2 envelope.
 *
 * A structural check alone is not enough: `AgentMessage` permits arbitrary extra
 * fields, so a V1 message that happened to carry `eventType`/`persistence` would
 * be mistaken for V2 and silently change how it is streamed, stored and counted.
 * Requiring this literal makes the two contracts impossible to confuse.
 */
export const RUNTIME_MESSAGE_PROTOCOL = 'agent-runtime/v2' as const;

/**
 * The message contract for `@AgentControllerV2`.
 *
 * V1 (`@AgentController`) infers everything from the shape of a Claude Code SDK
 * message: `type === 'stream_event'` means "don't persist", `msg.type` doubles
 * as the SSE event name, usage is read off a `result` message. That works while
 * Claude is the only agent SDK, but ties the runtime to one vendor's wire format.
 *
 * V2 inverts the relationship: the executor *declares* what the runtime needs to
 * know, and `payload` is never inspected by the framework. Any agent SDK — Claude,
 * Pi, Codex, or something written in-house — can be adapted by mapping its native
 * events onto this envelope, with no framework change.
 */
export interface RuntimeMessage {
  /** Discriminator; must be {@link RUNTIME_MESSAGE_PROTOCOL}. */
  protocol: typeof RUNTIME_MESSAGE_PROTOCOL;
  /**
   * SSE event name, surfacing as the `type` field of the `{ seq, type, data, ts }`
   * envelope. The runtime forwards it verbatim instead of deriving it from the payload.
   */
  eventType: string;
  /**
   * `transient` — forwarded over SSE only (streaming deltas, progress, keep-alives).
   * `durable`   — forwarded over SSE *and* written to thread history.
   *
   * Replaces V1's `type !== 'stream_event'` heuristic.
   */
  persistence: 'transient' | 'durable';
  /**
   * Opaque to the framework. Never parsed, never reshaped.
   *
   * Must be a plain (non-null, non-array) object: durable payloads are persisted
   * as JSONL records and annotated with bookkeeping fields under `eggExt`, which
   * neither a primitive nor an array can carry. Wrap a list in an object field.
   *
   * **Must not be mutated after being yielded.** The runtime holds it by
   * reference until the turn is persisted, which does not happen until the
   * session commits. An executor that reuses one buffer object across yields and
   * edits it in between will find every earlier record in that turn rewritten to
   * the final value — while the SSE stream already emitted the earlier ones. V1
   * `AgentMessage`s are held the same way; yield a fresh object each time.
   */
  payload: Record<string, unknown>;
  /**
   * Whether this message belongs to the user-visible conversation.
   *
   * `getThread` returns only conversational messages by default, mirroring V1's
   * "user + assistant" filter — but stated explicitly rather than inferred from
   * the payload. Only meaningful when `persistence` is `'durable'`; defaults to
   * `true` so a durable message is conversational unless declared otherwise.
   */
  conversational?: boolean;
  /**
   * Set to `true` on the first message whose underlying provider session has
   * reached a restart-recoverable point on disk.
   *
   * The runtime holds `cancelRun` until this is seen, so that whatever the thread
   * records on abort is also present in the provider's own session. Replaces V1's
   * `isSessionCommitted` callback with a self-describing field — no round-trip
   * back into the executor.
   *
   * Absent means "not yet committed": unlike V1 there is no heuristic fallback,
   * because the runtime cannot interpret an opaque payload.
   */
  sessionCommitted?: boolean;
  /**
   * Token usage for the run. Typically carried on the terminal message; when
   * several messages carry it the last one wins. Replaces V1's Claude-shaped
   * `result.usage` extraction.
   */
  usage?: RunUsage;
  /** Pure model API time in ms, replacing V1's `result.duration_api_ms`. */
  apiDurationMs?: number;
}

/**
 * Whether a value claims to be a V2 envelope, regardless of whether it is a
 * well-formed one.
 *
 * Routing and validation are deliberately separate. If a single predicate did
 * both, a *malformed* V2 envelope would fail it and fall through to the V1
 * branch — where, having no `type`, it would be named `message`, treated as
 * durable, and (since `undefined !== 'system'`) immediately marked committed,
 * quietly defeating V2's cancel-safety guarantee and persisting the envelope
 * instead of the payload. Claiming the brand is enough to be judged as V2.
 */
export function hasRuntimeMessageProtocol(msg: unknown): boolean {
  return !!msg && typeof msg === 'object' &&
    (msg as Partial<RuntimeMessage>).protocol === RUNTIME_MESSAGE_PROTOCOL;
}

/**
 * A payload the runtime can persist and annotate: a plain JSON-shaped object.
 *
 * Arrays, `Date`, `Map`, `Set` and class instances are rejected. Storage copies
 * a durable payload with object spread to attach `eggExt`, which reduces all of
 * them to their own enumerable keys — `{...new Date()}` is `{}` — so accepting
 * them would mean silently discarding the message's contents.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Why `msg` is not a well-formed {@link RuntimeMessage}, or `undefined` if it is.
 *
 * Returns a reason rather than a boolean so the runtime can tell an executor
 * exactly which field it got wrong, instead of failing anonymously.
 */
export function runtimeMessageViolation(msg: unknown): string | undefined {
  if (!msg || typeof msg !== 'object') return 'not an object';
  const m = msg as Partial<RuntimeMessage>;
  if (m.protocol !== RUNTIME_MESSAGE_PROTOCOL) {
    return `'protocol' must be '${RUNTIME_MESSAGE_PROTOCOL}'`;
  }
  if (typeof m.eventType !== 'string' || m.eventType === '') {
    return "'eventType' must be a non-empty string";
  }
  if (m.persistence !== 'transient' && m.persistence !== 'durable') {
    return "'persistence' must be 'transient' or 'durable'";
  }
  if (!isPlainObject(m.payload)) {
    return "'payload' must be a plain object";
  }
  return undefined;
}

/** Type guard distinguishing a well-formed V2 envelope from a V1 Claude-shaped message. */
export function isRuntimeMessage(msg: unknown): msg is RuntimeMessage {
  return runtimeMessageViolation(msg) === undefined;
}

/**
 * Bookkeeping attached to a persisted V2 record so reads can honour the
 * executor's `conversational` declaration without re-inspecting the payload.
 *
 * Namespaced under `eggExt`, which the runtime already owns on stored messages.
 * The protocol stamp is what makes the declaration trustworthy: a V1 record that
 * happened to use `conversational` as its own extension field must keep being
 * read by the V1 `type` rule, so a bare boolean is never enough on its own.
 */
export const RUNTIME_MESSAGE_CONVERSATIONAL_KEY = 'conversational';
export const RUNTIME_MESSAGE_PROTOCOL_KEY = 'runtimeProtocol';
