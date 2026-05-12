import type {
  AgentMessage,
  AgentRunConfig,
  AgentStore,
  GetThreadOptions,
  InputMessage,
  RunRecord,
  ThreadRecord,
  ObjectStorageClient } from '@eggjs/tegg-types/agent-runtime';
import { AgentObjectType, RunStatus, AgentNotFoundError } from '@eggjs/tegg-types/agent-runtime';

import { dateBucket, newRunId, newThreadId, nowUnix, reverseMs } from './AgentStoreUtils';

/**
 * Minimal structural type for the warn-logging channel used when a
 * background thread-time-index write fails. Both `egg-logger`'s
 * `EggLogger` and the global `console` satisfy this shape, so
 * applications can pass `app.logger` directly without importing any
 * egg-specific types here.
 *
 * The implementation is expected to follow Node's `util.format`
 * conventions: leading args fill the `%s` / `%d` / `%j` / `%o` / `%O`
 * placeholders in the format string, and any trailing args beyond the
 * placeholder count are appended to the rendered output via
 * `util.inspect`. For an `Error` instance in a trailing slot
 * `util.inspect` includes the stack trace and any `Error.cause` chain,
 * which is the property the warn-on-index-failure call site relies on
 * for observability. Both `console.warn` and `EggLogger.warn` honor
 * the `util.format` convention; a custom structured logger that does
 * not implement `%s`-interpolation may render the format string and
 * the args differently, which is a known idiomatic-difference between
 * the printf-style and the structured-log conventions.
 */
export interface OSSAgentStoreWarnLogger {
  warn(message: string, ...args: unknown[]): void;
}

export interface OSSAgentStoreOptions {
  client: ObjectStorageClient;
  prefix?: string;
  /**
   * Sink for warn messages emitted when the background time-index PUT
   * fails. Defaults to a thin wrapper around `console.warn`. Failures
   * of the background time-index PUT never propagate to the
   * `createThread` caller — they are observed exclusively through
   * this channel.
   */
  logger?: OSSAgentStoreWarnLogger;
  /**
   * IANA timezone name (or the case-insensitive literal `'UTC'`) used
   * to compute the `YYYY-MM-DD` date-bucket directory of the time
   * index. Defaults to `'UTC'` so that workers in physically different
   * regions agree on a single partition for a given absolute instant.
   * Set to e.g. `'Asia/Shanghai'` when the analytics calendar follows
   * a specific local timezone.
   */
  dateTimezone?: string;
}

/**
 * Thread metadata stored as a JSON object (excludes messages).
 * Messages are stored separately in a JSONL file for append-friendly
 * writes.
 */
type ThreadMetadata = Omit<ThreadRecord, 'messages'>;

/**
 * `AgentStore` implementation backed by an `ObjectStorageClient` (OSS,
 * S3, etc.).
 *
 * ## Storage layout
 *
 * ```
 * {prefix}threads/{id}/meta.json                                  — Thread metadata (JSON, source of truth)
 * {prefix}threads/{id}/messages.jsonl                             — Messages (JSONL, one AgentMessage per line)
 * {prefix}runs/{id}.json                                          — Run record (JSON)
 * {prefix}index/threads-by-date/{YYYY-MM-DD}/{revMs13}_{threadId} — Time-index sidecar (JSON body)
 * ```
 *
 * The time-index sidecar is a write-only, analytics-facing artifact:
 * it is created best-effort during `createThread`, never read by
 * `getThread`, and never mutated by `appendMessages` / `createRun` /
 * `updateRun`. Within a date-bucket directory the keys sort
 * newest-first under the ASC-only `ListObjects` semantics that OSS /
 * S3 expose, because the `revMs13` segment is the decimal complement
 * of the creation timestamp (see `reverseMs` in
 * `AgentStoreUtils.ts`). Across date buckets the directories sort
 * calendar-ascending, so a consumer that wants the globally newest N
 * threads enumerates the date prefixes in reverse-calendar order and
 * walks each one's contents in dictionary order.
 *
 * The body of each index object is a compact JSON document carrying
 * `{ threadId, createdAt, metadata }`, mirroring the
 * `threads/{id}/meta.json`'s `createdAt` field. Both timestamp values
 * derive from a single `Date.now()` call inside `createThread`, so
 * the seconds-precision meta value and the millisecond-precision
 * index-key value reflect the same physical instant and cannot
 * disagree across a date boundary.
 *
 * The index PUT itself is intentionally fire-and-forget. It runs on a
 * background promise registered in the `pendingIndexWrites` Set,
 * contributes zero latency to `createThread`'s happy path, and any
 * rejection becomes a single warn-log line via the injected
 * `OSSAgentStoreWarnLogger`. The Set lets `destroy()` (the standard
 * Egg.js `beforeClose` cleanup point for this kind of resource) wait
 * for the in-flight writes to settle via the public
 * `awaitPendingWrites()` method.
 */
export class OSSAgentStore implements AgentStore {
  private readonly client: ObjectStorageClient;
  private readonly prefix: string;
  private readonly logger: OSSAgentStoreWarnLogger;
  private readonly dateTimezone: string;
  /**
   * Background time-index PUT promises that are still in flight. Each
   * promise installs a `.then(success, failure)` handler at the
   * bottom of `createThread` that removes the promise from the Set
   * when it settles, so the Set's membership exactly matches the
   * in-flight set at every observation point.
   *
   * `awaitPendingWrites()` and `destroy()` drain the Set. The drain
   * is a loop over fresh `[...this.pendingIndexWrites]` snapshots,
   * not a one-shot `Promise.allSettled` against a single snapshot,
   * so that a `createThread` invocation that lands during the
   * shutdown sequence still gets its background write awaited — the
   * spread-operator snapshot would otherwise have already been taken
   * and the late-arrival would slip through.
   */
  private readonly pendingIndexWrites = new Set<Promise<void>>();

  constructor(options: OSSAgentStoreOptions) {
    this.client = options.client;
    const raw = options.prefix ?? '';
    this.prefix = raw && !raw.endsWith('/') ? raw + '/' : raw;
    this.logger = options.logger ?? { warn: (message, ...args) => console.warn(message, ...args) };
    this.dateTimezone = options.dateTimezone ?? 'UTC';
  }

  private threadMetaKey(threadId: string): string {
    return `${this.prefix}threads/${threadId}/meta.json`;
  }

  private threadMessagesKey(threadId: string): string {
    return `${this.prefix}threads/${threadId}/messages.jsonl`;
  }

  private runKey(runId: string): string {
    return `${this.prefix}runs/${runId}.json`;
  }

  /**
   * Compose the time-index sidecar key for a thread created at the
   * given millisecond timestamp. `dateBucket` resolves the IANA
   * timezone to a `YYYY-MM-DD` directory name and `reverseMs`
   * produces the decimal-complement suffix that gives newest-first
   * ordering under the standard dictionary-order `ListObjects`
   * semantics. The full `threadId` is appended verbatim so a
   * downstream consumer can read it directly from the OSS key
   * without opening the object body.
   */
  private threadTimeIndexKey(nowMs: number, threadId: string): string {
    const date = dateBucket(nowMs, this.dateTimezone);
    const rev = reverseMs(nowMs);
    return `${this.prefix}index/threads-by-date/${date}/${rev}_${threadId}`;
  }

  async init(): Promise<void> {
    await this.client.init?.();
  }

  async destroy(): Promise<void> {
    // Drain the in-flight background time-index writes before
    // tearing down the underlying client. The drain loop in
    // `awaitPendingWrites` swallows individual failures (which the
    // catch handler in `createThread` has already turned into
    // warn-log lines), so `destroy` itself does not reject because
    // of an index-write miss.
    await this.awaitPendingWrites();
    await this.client.destroy?.();
  }

  /**
   * Wait for every in-flight background time-index write to settle
   * (resolve or reject). Called internally by `destroy()` to keep
   * graceful shutdown from losing writes, and exposed publicly for
   * tests and external callers that need an explicit drain
   * checkpoint.
   *
   * Never rejects: individual write failures have already been
   * converted into warn-log lines by the catch handler installed in
   * the background-write chain inside `createThread`.
   *
   * The drain is a `while`-loop over fresh
   * `[...this.pendingIndexWrites]` snapshots rather than a single
   * `Promise.allSettled` against a one-shot snapshot. This handles
   * the edge case where a caller invokes `createThread` while a
   * drain is in progress: the spread-operator snapshot is taken at
   * the moment the `Promise.allSettled` call is constructed, and
   * any background promise added to the Set after that moment is
   * not in the snapshot and would not be waited on by that
   * particular `allSettled`. The surrounding `while` loop notices
   * the Set is still non-empty after the previous iteration's
   * `allSettled` returns (the late-arrival is the only entry left,
   * having survived because it wasn't in the snapshot the previous
   * iteration awaited) and takes a fresh snapshot to wait on its
   * settlement.
   *
   * The loop terminates as long as each individual background write
   * eventually settles. In the standard Egg.js shutdown sequence
   * the request handlers have already returned by the time
   * `beforeClose` fires (and therefore by the time `destroy()` and
   * this method are called), so there is no live caller of
   * `createThread` during the drain and the loop almost always
   * exits on the second iteration's `size === 0` check. The
   * abstract pattern of "graceful shutdown waits for the in-flight
   * background-task set to clear" matches the `BackgroundTaskHelper`
   * in `@eggjs/tegg-runtime`, which the project root's `CLAUDE.md`
   * "Use BackgroundTaskHelper for Async Tasks" section flags as the
   * canonical drain idiom in the tegg ecosystem.
   */
  async awaitPendingWrites(): Promise<void> {
    while (this.pendingIndexWrites.size > 0) {
      await Promise.allSettled([ ...this.pendingIndexWrites ]);
    }
  }

  async createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord> {
    const threadId = newThreadId();
    // Take the wall clock exactly once. The seconds value that goes
    // into `meta.createdAt` and the milliseconds value encoded into
    // the time-index key both derive from this single observation, so
    // they cannot drift across a millisecond boundary — and, in the
    // worst-case midnight corner, cannot land in different
    // date-bucket directories.
    const nowMs = Date.now();
    const createdAt = Math.floor(nowMs / 1000);
    const meta: ThreadMetadata = {
      id: threadId,
      object: AgentObjectType.Thread,
      metadata: metadata ?? {},
      createdAt,
    };
    // 1) Main path: the canonical `threads/{id}/meta.json` PUT.
    // Failure here surfaces to the caller exactly as it did before
    // the time-index feature was introduced — the
    // pre-time-index behavior of `createThread` is preserved.
    await this.client.put(this.threadMetaKey(threadId), JSON.stringify(meta));

    // 2) Time-index sidecar PUT, fire-and-forget. The promise is
    // tracked in `pendingIndexWrites` so `awaitPendingWrites()`
    // (called by `destroy()`) can drain it during a graceful
    // shutdown, but `createThread` does not await its settlement
    // and the caller sees zero added latency on the happy path.
    //
    // A rejection is caught by the second arm of the two-arg
    // `.then(success, failure)` form below, which is the idiomatic
    // way to silence the unhandled-promise-rejection warning
    // without inserting a separate `.catch` chain. The Error object
    // is passed verbatim as the un-interpolated trailing argument
    // to `logger.warn` so the underlying `util.format`-style
    // renderer (in Node's `console.warn` and in `egg-logger`'s
    // `EggLogger.warn`) reaches for `util.inspect`, which on an
    // `Error` instance prints the stack trace and the
    // `Error.cause` chain — the property that the AI-reviewer
    // feedback on the original PR's first revision asked for. An
    // earlier draft stringified the Error to its `.message` ahead
    // of the warn call, which produced the message-only
    // `"Error: <text>"` form without a stack; the present shape
    // preserves the stack.
    const indexKey = this.threadTimeIndexKey(nowMs, threadId);
    const indexBody = JSON.stringify({
      threadId,
      createdAt,
      metadata: meta.metadata,
    });
    const tracked: Promise<void> = this.client.put(indexKey, indexBody).then(
      () => {
        // Run-to-completion note: this `tracked` reference resolves
        // to the same binding the outer-scope `const tracked = ...`
        // line assigns, because JavaScript's synchronous body of
        // the surrounding function (the synchronous portion of
        // `createThread` from the `Date.now()` call through the
        // `this.pendingIndexWrites.add(tracked)` line that follows
        // this `.then`-arg expression) completes before any
        // microtask handler attached by `.then` is allowed to run.
        // So by the time this success handler executes, `tracked`
        // is bound to the value of the right-hand side of its own
        // declaration — the `Promise<void>` produced by the
        // `this.client.put(...).then(...)` chain. The Set's
        // `delete` then-removes the same Promise object that was
        // added to it on the line after the assignment.
        this.pendingIndexWrites.delete(tracked);
      },
      (err: unknown) => {
        this.pendingIndexWrites.delete(tracked);
        // Wrap non-`Error` rejection values once so the trailing
        // arg always has a stack. JavaScript allows `throw <any
        // value>`, so a rejecting promise's reason can in principle
        // be a string, a plain object, or any other non-Error
        // thing; the wrap site's freshly-constructed Error gives at
        // least the catch handler's own stack frame as a
        // traceback, which is better than a bare-string log entry.
        // For the common case where the underlying client rejected
        // with an actual `Error` (e.g. ali-oss-client's
        // `NoSuchKey` or `AccessDenied`), the original Error
        // passes through unchanged and its stack reaches the log
        // intact.
        const errForLog: Error = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          '[OSSAgentStore] failed to write thread time index threadId=%s key=%s',
          threadId,
          indexKey,
          errForLog,
        );
      },
    );
    this.pendingIndexWrites.add(tracked);

    return { ...meta, messages: [] };
  }

  async getThread(threadId: string, options?: GetThreadOptions): Promise<ThreadRecord> {
    const [ metaData, messagesData ] = await Promise.all([
      this.client.get(this.threadMetaKey(threadId)),
      this.client.get(this.threadMessagesKey(threadId)),
    ]);
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    const meta = JSON.parse(metaData) as ThreadMetadata;

    let messages: AgentMessage[] = messagesData
      ? messagesData
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line) as AgentMessage)
      : [];

    // By default only return the conversation-shape messages (user +
    // assistant), matching the SDK's `getSessionMessages` semantics.
    // The JSONL file is the full event log including framework-level
    // entries (system events, tool results, etc.); the filter
    // narrows the visible set to the application-level conversation.
    if (!options?.includeAllMessages) {
      messages = messages.filter(m => m.type === 'user' || m.type === 'assistant');
    }

    return { ...meta, messages };
  }

  async appendMessages(threadId: string, messages: AgentMessage[]): Promise<void> {
    const metaData = await this.client.get(this.threadMetaKey(threadId));
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    if (messages.length === 0) return;

    const lines = messages.map(m => JSON.stringify(m)).join('\n') + '\n';
    const messagesKey = this.threadMessagesKey(threadId);

    if (this.client.append) {
      await this.client.append(messagesKey, lines);
    } else {
      const existing = (await this.client.get(messagesKey)) ?? '';
      await this.client.put(messagesKey, existing + lines);
    }
  }

  async createRun(
    input: InputMessage[],
    threadId?: string,
    config?: AgentRunConfig,
    metadata?: Record<string, unknown>,
  ): Promise<RunRecord> {
    const runId = newRunId();
    const record: RunRecord = {
      id: runId,
      object: AgentObjectType.ThreadRun,
      threadId,
      status: RunStatus.Queued,
      input,
      config,
      metadata,
      createdAt: nowUnix(),
    };
    await this.client.put(this.runKey(runId), JSON.stringify(record));
    return record;
  }

  async getRun(runId: string): Promise<RunRecord> {
    const data = await this.client.get(this.runKey(runId));
    if (!data) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    return JSON.parse(data) as RunRecord;
  }

  async updateRun(runId: string, updates: Partial<RunRecord>): Promise<void> {
    const run = await this.getRun(runId);
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete (safeUpdates as any).object;
    Object.assign(run, safeUpdates);
    await this.client.put(this.runKey(runId), JSON.stringify(run));
  }
}
