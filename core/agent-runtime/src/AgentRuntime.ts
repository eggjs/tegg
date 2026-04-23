import { EventEmitter } from 'node:events';
import { appendFileSync, createReadStream, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import type {
  CreateRunInput,
  GetThreadOptions,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  AgentMessage,
  AgentStore,
  StreamEvent,
} from '@eggjs/tegg-types/agent-runtime';
import {
  RunStatus,
  AgentObjectType,
  AgentConflictError,
  AgentNotFoundError,
  AgentTimeoutError,
} from '@eggjs/tegg-types/agent-runtime';
import type { EggLogger } from 'egg-logger';

import { MessageConverter } from './MessageConverter';
import { RunBuilder } from './RunBuilder';
import type { SSEWriter } from './SSEWriter';

const HEARTBEAT_INTERVAL_MS = 10_000;
const EVENT_DIR = join(tmpdir(), 'agent-runtime-events');
const DEFAULT_CANCEL_COMMIT_TIMEOUT_MS = 30_000;

interface RunEventBuffer {
  filePath: string;
  lastSeq: number;
  done: boolean;
  emitter: EventEmitter;
}

export const AGENT_RUNTIME: unique symbol = Symbol('agentRuntime');

/**
 * The executor interface — execRun is required so the runtime can delegate
 * execution back through the controller's prototype chain (AOP/mock friendly).
 *
 * `isSessionCommitted` is an optional hook that lets the executor tell the
 * runtime when its underlying session has been persisted to storage (e.g. the
 * Claude Code SDK jsonl file). The runtime uses this to decide when a pending
 * `cancelRun` can safely abort and persist the thread. See AgentHandler.ts
 * for the semantics and the default heuristic used when this hook is absent.
 */
export interface AgentExecutor {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage>;
  isSessionCommitted?(msg: AgentMessage, history: AgentMessage[]): boolean | Promise<boolean>;
}

export interface AgentRuntimeOptions {
  executor: AgentExecutor;
  store: AgentStore;
  logger: EggLogger;
  /**
   * How long cancelRun should wait for the executor's session to become
   * committed before giving up and marking the run as failed. Defaults to
   * 30 seconds.
   */
  cancelCommitTimeoutMs?: number;
}

interface RunTaskState {
  promise: Promise<void>;
  abortController: AbortController;
  /** True once the executor has reported (or the heuristic has detected) that
   *  its session is safely persisted and the run can be cancelled cleanly. */
  committed: boolean;
  /** Emits 'commit' the first time committed flips to true, and 'end' when the
   *  task's execution finally finishes (success, failure, or abort). */
  emitter: EventEmitter;
}

export class AgentRuntime {
  private static readonly TERMINAL_RUN_STATUSES = new Set<RunStatus>([
    RunStatus.Completed,
    RunStatus.Failed,
    RunStatus.Cancelled,
    RunStatus.Expired,
  ]);

  private store: AgentStore;
  private runningTasks: Map<string, RunTaskState>;
  private runBuffers: Map<string, RunEventBuffer>;
  private executor: AgentExecutor;
  private logger: EggLogger;
  private cancelCommitTimeoutMs: number;

  constructor(options: AgentRuntimeOptions) {
    this.executor = options.executor;
    this.store = options.store;
    if (!options.logger) {
      throw new Error('AgentRuntimeOptions.logger is required');
    }
    this.logger = options.logger;
    this.cancelCommitTimeoutMs = options.cancelCommitTimeoutMs ?? DEFAULT_CANCEL_COMMIT_TIMEOUT_MS;
    this.runningTasks = new Map();
    this.runBuffers = new Map();
  }

  async createThread(): Promise<ThreadObject> {
    const thread = await this.store.createThread();
    return {
      id: thread.id,
      object: AgentObjectType.Thread,
      createdAt: thread.createdAt,
      metadata: thread.metadata ?? {},
    };
  }

  async getThread(threadId: string, options?: GetThreadOptions): Promise<ThreadObjectWithMessages> {
    const thread = await this.store.getThread(threadId, options);
    return {
      id: thread.id,
      object: AgentObjectType.Thread,
      createdAt: thread.createdAt,
      metadata: thread.metadata ?? {},
      messages: thread.messages,
    };
  }

  private async ensureThread(input: CreateRunInput): Promise<{ threadId: string; input: CreateRunInput }> {
    if (input.threadId) {
      const thread = await this.store.getThread(input.threadId);
      const isResume = thread.messages.length > 0;
      return { threadId: input.threadId, input: { ...input, isResume } };
    }
    const thread = await this.store.createThread();
    return { threadId: thread.id, input: { ...input, threadId: thread.id, isResume: false } };
  }

  async syncRun(input: CreateRunInput, signal?: AbortSignal): Promise<RunObject> {
    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    // Bridge external signal to an internal AbortController so cancelRun can abort syncRun
    const abortController = new AbortController();
    if (signal) {
      if (signal.aborted) {
        abortController.abort();
      } else {
        signal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    // Register in runningTasks so cancelRun can find and await this run.
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>(r => {
      resolveTask = r;
    });
    const task: RunTaskState = {
      promise: taskPromise,
      abortController,
      committed: false,
      emitter: new EventEmitter(),
    };
    this.runningTasks.set(run.id, task);

    const streamMessages: AgentMessage[] = [];
    try {
      await this.store.updateRun(run.id, rb.start());

      for await (const msg of this.executor.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) {
          if (task.committed) {
            await this.persistMessagesOnAbort(threadId, input, streamMessages);
          }
          await this.finaliseAbortedRun(run.id);
          const latest = await this.store.getRun(run.id);
          return RunBuilder.fromRecord(latest).snapshot();
        }
        streamMessages.push(msg);
        await this.markCommittedIfNeeded(task, msg, streamMessages);
      }

      const usage = MessageConverter.extractUsage(streamMessages);

      // Append input messages + stream messages to thread (excluding stream_event deltas)
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toAgentMessages(input.input.messages),
        ...MessageConverter.filterForStorage(streamMessages),
      ]);

      await this.store.updateRun(run.id, rb.complete(usage));

      return rb.snapshot();
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        if (task.committed) {
          await this.persistMessagesOnAbort(threadId, input, streamMessages);
        }
        await this.finaliseAbortedRun(run.id);
        const latest = await this.store.getRun(run.id);
        return RunBuilder.fromRecord(latest).snapshot();
      }
      try {
        await this.store.updateRun(run.id, rb.fail(err as Error));
      } catch (storeErr) {
        this.logger.error('[AgentRuntime] failed to update run status after syncRun error:', storeErr);
      }
      throw err;
    } finally {
      task.emitter.emit('end');
      resolveTask();
      this.runningTasks.delete(run.id);
    }
  }

  async asyncRun(input: CreateRunInput): Promise<RunObject> {
    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    const abortController = new AbortController();

    // Capture queued snapshot before background task mutates state
    const queuedSnapshot = rb.snapshot();

    // Register in runningTasks before the IIFE starts executing to avoid a race
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>(r => {
      resolveTask = r;
    });
    const task: RunTaskState = {
      promise: taskPromise,
      abortController,
      committed: false,
      emitter: new EventEmitter(),
    };
    this.runningTasks.set(run.id, task);

    (async () => {
      const streamMessages: AgentMessage[] = [];
      try {
        await this.store.updateRun(run.id, rb.start());

        for await (const msg of this.executor.execRun(input, abortController.signal)) {
          if (abortController.signal.aborted) {
            if (task.committed) {
              await this.persistMessagesOnAbort(threadId, input, streamMessages);
            }
            await this.finaliseAbortedRun(run.id);
            return;
          }
          streamMessages.push(msg);
          await this.markCommittedIfNeeded(task, msg, streamMessages);
        }

        // Check if another worker has cancelled this run before writing final state
        const currentRun = await this.store.getRun(run.id);
        if (currentRun.status === RunStatus.Cancelling || currentRun.status === RunStatus.Cancelled) {
          return;
        }

        const usage = MessageConverter.extractUsage(streamMessages);

        // Append input messages + stream messages to thread (excluding stream_event deltas)
        await this.store.appendMessages(threadId, [
          ...MessageConverter.toAgentMessages(input.input.messages),
          ...MessageConverter.filterForStorage(streamMessages),
        ]);

        await this.store.updateRun(run.id, rb.complete(usage));
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          try {
            const currentRun = await this.store.getRun(run.id);
            if (currentRun.status !== RunStatus.Cancelling && currentRun.status !== RunStatus.Cancelled) {
              await this.store.updateRun(run.id, rb.fail(err as Error));
            }
          } catch (storeErr) {
            this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
          }
        } else {
          if (task.committed) {
            await this.persistMessagesOnAbort(threadId, input, streamMessages);
          }
          await this.finaliseAbortedRun(run.id);
          this.logger.error('[AgentRuntime] execRun error during abort:', err);
        }
      } finally {
        task.emitter.emit('end');
        resolveTask();
        this.runningTasks.delete(run.id);
      }
    })();

    return queuedSnapshot;
  }

  /**
   * Start a streaming run with background execution.
   * The task continues running even if the SSE client disconnects.
   * Events are persisted to a JSONL file for reconnection support.
   */
  async streamRun(input: CreateRunInput, writer: SSEWriter): Promise<void> {
    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    // Create event buffer for this run (events persisted to JSONL file)
    if (!existsSync(EVENT_DIR)) {
      mkdirSync(EVENT_DIR, { recursive: true });
    }
    const buffer: RunEventBuffer = {
      filePath: join(EVENT_DIR, `${run.id}.jsonl`),
      lastSeq: 0,
      done: false,
      emitter: new EventEmitter(),
    };
    this.runBuffers.set(run.id, buffer);

    // Emit initial lifecycle event
    this.pushEvent(buffer, 'run_created', { runId: run.id, threadId });

    // Start background execution (not tied to SSE connection)
    const abortController = new AbortController();
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>(r => {
      resolveTask = r;
    });
    const task: RunTaskState = {
      promise: taskPromise,
      abortController,
      committed: false,
      emitter: new EventEmitter(),
    };
    this.runningTasks.set(run.id, task);

    this.executeStreamBackground(input, run.id, threadId, rb, buffer, task)
      .finally(() => {
        task.emitter.emit('end');
        resolveTask();
        this.runningTasks.delete(run.id);
        this.runBuffers.delete(run.id);
        buffer.emitter.removeAllListeners();
      });

    // Stream events to the current client
    await this.streamEventsToWriter(buffer, writer, 0);
  }

  /**
   * Reconnect to a running or completed run's event stream.
   * Replays events after lastSeq, then continues real-time if still running.
   */
  async getRunStream(runId: string, writer: SSEWriter, lastSeq = 0): Promise<void> {
    const buffer = this.runBuffers.get(runId);
    if (buffer) {
      await this.streamEventsToWriter(buffer, writer, lastSeq);
      return;
    }

    // Task already finished — replay from JSONL file directly
    const filePath = join(EVENT_DIR, `${runId}.jsonl`);
    if (!existsSync(filePath)) {
      throw new AgentNotFoundError(`Run event stream not found: ${runId}`);
    }
    for await (const event of this.readEventsFromFile(filePath, lastSeq)) {
      if (writer.closed) return;
      writer.writeEvent(event.type, event);
    }
    if (!writer.closed) writer.end();
  }

  private pushEvent(buffer: RunEventBuffer, type: string, data: unknown): void {
    const event: StreamEvent = {
      seq: ++buffer.lastSeq,
      type,
      data,
      ts: Date.now(),
    };
    appendFileSync(buffer.filePath, JSON.stringify(event) + '\n');
    buffer.emitter.emit('event', event);
  }

  /**
   * Execute the run in the background, persisting events to JSONL file.
   * AgentMessage objects are passed through directly as event data.
   */
  private async executeStreamBackground(
    input: CreateRunInput,
    runId: string,
    threadId: string,
    rb: RunBuilder,
    buffer: RunEventBuffer,
    task: RunTaskState,
  ): Promise<void> {
    const abortController = task.abortController;
    const streamMessages: AgentMessage[] = [];
    try {
      await this.store.updateRun(runId, rb.start());

      for await (const msg of this.executor.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) {
          if (task.committed) {
            await this.persistMessagesOnAbort(threadId, input, streamMessages);
          }
          await this.finaliseAbortedRun(runId);
          this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
          return;
        }

        streamMessages.push(msg);

        // Pass through SDK message directly as event data
        const eventType = msg.type || 'message';
        this.pushEvent(buffer, eventType, msg);

        await this.markCommittedIfNeeded(task, msg, streamMessages);
      }

      // Check if another worker has cancelled this run before writing final state
      const currentRun = await this.store.getRun(runId);
      if (currentRun.status === RunStatus.Cancelling || currentRun.status === RunStatus.Cancelled) {
        if (task.committed) {
          await this.persistMessagesOnAbort(threadId, input, streamMessages);
        }
        this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
        return;
      }

      // Persist to store (excluding stream_event deltas)
      const usage = MessageConverter.extractUsage(streamMessages);
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toAgentMessages(input.input.messages),
        ...MessageConverter.filterForStorage(streamMessages),
      ]);
      await this.store.updateRun(runId, rb.complete(usage));

      this.pushEvent(buffer, 'done', { result: 'success', runId });
    } catch (err: unknown) {
      if (!abortController.signal.aborted) {
        try {
          const currentRun = await this.store.getRun(runId);
          if (currentRun.status !== RunStatus.Cancelling && currentRun.status !== RunStatus.Cancelled) {
            await this.store.updateRun(runId, rb.fail(err as Error));
          }
        } catch (storeErr) {
          this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
        }
        this.pushEvent(buffer, 'error', { message: (err as Error).message, runId });
      } else {
        if (task.committed) {
          await this.persistMessagesOnAbort(threadId, input, streamMessages);
        }
        await this.finaliseAbortedRun(runId);
        this.logger.error('[AgentRuntime] execRun error during abort:', err);
        this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
      }
    } finally {
      buffer.done = true;
      buffer.emitter.emit('event');
    }
  }

  /**
   * Flip the task's `committed` flag the first time the executor's current
   * message indicates its session has been persisted to storage. Uses the
   * executor's `isSessionCommitted` hook when available, otherwise a default
   * heuristic where any message with `type !== 'system'` counts as committed
   * (the Claude Code SDK writes the jsonl around the first non-system event).
   */
  private async markCommittedIfNeeded(
    task: RunTaskState,
    msg: AgentMessage,
    history: AgentMessage[],
  ): Promise<void> {
    if (task.committed) return;
    let committed: boolean;
    try {
      committed = typeof this.executor.isSessionCommitted === 'function'
        ? await this.executor.isSessionCommitted(msg, history)
        : msg.type !== 'system';
    } catch (err) {
      this.logger.error('[AgentRuntime] isSessionCommitted threw, treating as not committed:', err);
      committed = false;
    }
    if (committed) {
      task.committed = true;
      task.emitter.emit('commit');
    }
  }

  /**
   * Wait until the task reports that its session is committed, or the task
   * finishes on its own, or the timeout elapses. Rejects with
   * AgentTimeoutError on timeout. Resolves without error when the task ends
   * before committing — in that case the caller should re-read the run's
   * terminal status rather than trying to cancel further.
   */
  private waitForCommitted(task: RunTaskState, timeoutMs: number): Promise<void> {
    if (task.committed) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = globalThis.setTimeout(() => {
        cleanup();
        reject(new AgentTimeoutError(
          `Timed out waiting ${timeoutMs}ms for executor session to be committed before cancel`,
        ));
      }, timeoutMs);
      const onCommit = (): void => {
        cleanup();
        resolve();
      };
      const onEnd = (): void => {
        cleanup();
        resolve();
      };
      const cleanup = (): void => {
        clearTimeout(timer);
        task.emitter.off('commit', onCommit);
        task.emitter.off('end', onEnd);
      };
      task.emitter.once('commit', onCommit);
      task.emitter.once('end', onEnd);
    });
  }

  /**
   * Persist input + collected stream messages to the thread when a run is
   * aborted. Keeping the thread in sync with any partial state that the
   * executor has already written (e.g. Claude CLI session file) is what
   * allows subsequent resume requests to continue from a consistent history
   * instead of diverging and failing at executor startup.
   *
   * Callers must check `task.committed` before invoking this; if the
   * executor never reached a committed state the thread should be left
   * untouched so the next run starts fresh instead of trying to resume a
   * session that was never created on disk.
   *
   * Errors are swallowed here so a store failure cannot mask the abort or
   * prevent cancelRun from finalising the run status.
   */
  private async persistMessagesOnAbort(
    threadId: string,
    input: CreateRunInput,
    streamMessages: AgentMessage[],
  ): Promise<void> {
    try {
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toAgentMessages(input.input.messages),
        ...MessageConverter.filterForStorage(streamMessages),
      ]);
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to persist messages on abort:', err);
    }
  }

  /**
   * Push an aborted run to a terminal `cancelled` state when nobody else
   * will. Abort can be driven either by `cancelRun` — which already owns
   * the `in_progress → cancelling → cancelled` transition — or by an
   * external `AbortSignal` / `destroy()`, where the run would otherwise
   * stay stuck in `in_progress` forever.
   *
   * Behaviour:
   * - terminal status (completed/failed/cancelled/expired): no-op.
   * - `cancelling`: no-op, let `cancelRun` finish the transition.
   * - `in_progress` / `queued`: write `cancelling` then `cancelled`.
   *
   * Errors are swallowed so a store failure cannot mask the abort.
   */
  private async finaliseAbortedRun(runId: string): Promise<void> {
    try {
      const current = await this.store.getRun(runId);
      if (AgentRuntime.TERMINAL_RUN_STATUSES.has(current.status)) return;
      if (current.status === RunStatus.Cancelling) return;

      const rb = RunBuilder.fromRecord(current);
      await this.store.updateRun(runId, rb.cancelling());
      await this.store.updateRun(runId, rb.cancel());
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to finalise aborted run:', err);
    }
  }

  private async* readEventsFromFile(filePath: string, afterSeq: number): AsyncGenerator<StreamEvent> {
    if (!existsSync(filePath)) return;
    const rl = createInterface({ input: createReadStream(filePath) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StreamEvent;
        if (event.seq > afterSeq) {
          yield event;
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  private async streamEventsToWriter(
    buffer: RunEventBuffer,
    writer: SSEWriter,
    lastSeq: number,
  ): Promise<void> {
    // Phase 1: Replay from JSONL file
    let lastWrittenSeq = lastSeq;
    for await (const event of this.readEventsFromFile(buffer.filePath, lastSeq)) {
      if (writer.closed) return;
      writer.writeEvent(event.type, event);
      lastWrittenSeq = event.seq;
    }

    if (buffer.done) {
      if (!writer.closed) writer.end();
      return;
    }

    // Phase 2: Real-time events via EventEmitter + heartbeat
    const queue: StreamEvent[] = [];
    let waitResolve: (() => void) | null = null;

    function onEvent(event?: StreamEvent): void {
      if (event) queue.push(event);
      waitResolve?.();
    }

    buffer.emitter.on('event', onEvent);

    try {
      // Catch-up: drain any events that arrived during Phase 1 file read
      for await (const event of this.readEventsFromFile(buffer.filePath, lastWrittenSeq)) {
        if (writer.closed) return;
        if (event.seq > lastWrittenSeq) {
          writer.writeEvent(event.type, event);
          lastWrittenSeq = event.seq;
        }
      }

      const waitForEvent = () => new Promise<'event' | 'heartbeat'>(resolve => {
        waitResolve = () => resolve('event');
        setTimeout(() => resolve('heartbeat'), HEARTBEAT_INTERVAL_MS);
      });

      while (!buffer.done || queue.length > 0) {
        while (queue.length > 0) {
          const event = queue.shift()!;
          if (event.seq > lastWrittenSeq) {
            if (writer.closed) return;
            writer.writeEvent(event.type, event);
            lastWrittenSeq = event.seq;
          }
        }

        if (buffer.done) break;
        if (writer.closed) return;

        const reason = await waitForEvent();
        waitResolve = null;
        if (reason === 'heartbeat' && queue.length === 0 && !buffer.done) {
          if (writer.closed) return;
          writer.writeComment('keepalive');
        }
      }
    } finally {
      buffer.emitter.off('event', onEvent);
    }

    if (!writer.closed) writer.end();
  }

  async getRun(runId: string): Promise<RunObject> {
    const run = await this.store.getRun(runId);
    return RunBuilder.fromRecord(run).snapshot();
  }

  /**
   * Cancel a running task. The call blocks until either (a) the executor
   * reports its session is safely committed to storage, and the task has
   * been aborted and the thread persisted, or (b) the commit watchdog times
   * out, in which case the run is marked `failed` (not `cancelled`) and
   * AgentTimeoutError is thrown to the caller.
   *
   * The hold is there to guarantee that whatever user input the thread
   * records on abort is also present in the executor's own persistent
   * session (e.g. Claude Code SDK jsonl), so a subsequent resume request
   * on the same thread doesn't diverge from a session that was never
   * actually written.
   */
  async cancelRun(runId: string): Promise<RunObject> {
    const run = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(run.status)) {
      throw new AgentConflictError(`Cannot cancel run with status '${run.status}'`);
    }

    const rb = RunBuilder.fromRecord(run);
    await this.store.updateRun(runId, rb.cancelling());

    const task = this.runningTasks.get(runId);
    if (task) {
      if (!task.committed) {
        try {
          await this.waitForCommitted(task, this.cancelCommitTimeoutMs);
        } catch (err) {
          // Commit watchdog timed out. Mark the run as failed *before*
          // aborting so the execution path's finaliseAbortedRun sees a
          // terminal status and skips the cancelled transition. The thread
          // is left untouched because task.committed is still false.
          try {
            await this.store.updateRun(runId, rb.fail(err as Error));
          } catch (storeErr) {
            this.logger.error('[AgentRuntime] failed to mark run failed after cancel timeout:', storeErr);
          }
          task.abortController.abort();
          await task.promise.catch(() => {
            /* ignore */
          });
          throw err;
        }
      }
      task.abortController.abort();
      await task.promise.catch(() => {
        /* ignore */
      });
    }

    const freshRun = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(freshRun.status)) {
      return RunBuilder.fromRecord(freshRun).snapshot();
    }

    try {
      await this.store.updateRun(runId, rb.cancel());
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to write cancelled state after cancelling:', err);
      const fallback = await this.store.getRun(runId);
      return RunBuilder.fromRecord(fallback).snapshot();
    }

    return rb.snapshot();
  }

  async waitForPendingTasks(): Promise<void> {
    if (this.runningTasks.size) {
      const pending = Array.from(this.runningTasks.values()).map(t => t.promise);
      await Promise.allSettled(pending);
    }
  }

  async destroy(): Promise<void> {
    for (const task of this.runningTasks.values()) {
      task.abortController.abort();
    }
    await this.waitForPendingTasks();

    for (const buffer of this.runBuffers.values()) {
      buffer.emitter.removeAllListeners();
    }
    this.runBuffers.clear();

    if (this.store.destroy) {
      await this.store.destroy();
    }
  }

  static create(options: AgentRuntimeOptions): AgentRuntime {
    return new AgentRuntime(options);
  }
}
