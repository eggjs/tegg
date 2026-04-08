import { EventEmitter } from 'node:events';

import type {
  CreateRunInput,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  AgentStreamMessage,
  AgentStore,
  StreamEvent,
} from '@eggjs/tegg-types/agent-runtime';
import { RunStatus, AgentObjectType, AgentConflictError, AgentNotFoundError } from '@eggjs/tegg-types/agent-runtime';
import type { EggLogger } from 'egg-logger';

import { MessageConverter } from './MessageConverter';
import { RunBuilder } from './RunBuilder';
import type { SSEWriter } from './SSEWriter';

const HEARTBEAT_INTERVAL_MS = 10_000;
const BUFFER_TTL_MS = 5 * 60 * 1000;

interface RunEventBuffer {
  events: StreamEvent[];
  lastSeq: number;
  done: boolean;
  emitter: EventEmitter;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

export const AGENT_RUNTIME: unique symbol = Symbol('agentRuntime');

/**
 * The executor interface — only requires execRun so the runtime can delegate
 * execution back through the controller's prototype chain (AOP/mock friendly).
 */
export interface AgentExecutor {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage>;
}

export interface AgentRuntimeOptions {
  executor: AgentExecutor;
  store: AgentStore;
  logger: EggLogger;
}

export class AgentRuntime {
  private static readonly TERMINAL_RUN_STATUSES = new Set<RunStatus>([
    RunStatus.Completed,
    RunStatus.Failed,
    RunStatus.Cancelled,
    RunStatus.Expired,
  ]);

  private store: AgentStore;
  private runningTasks: Map<string, { promise: Promise<void>; abortController: AbortController }>;
  private runBuffers: Map<string, RunEventBuffer>;
  private executor: AgentExecutor;
  private logger: EggLogger;

  constructor(options: AgentRuntimeOptions) {
    this.executor = options.executor;
    this.store = options.store;
    if (!options.logger) {
      throw new Error('AgentRuntimeOptions.logger is required');
    }
    this.logger = options.logger;
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

  async getThread(threadId: string): Promise<ThreadObjectWithMessages> {
    const thread = await this.store.getThread(threadId);
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
    // Use a real pending promise (not Promise.resolve()) so cancelRun's
    // `await task.promise` blocks until syncRun's try/finally completes.
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>(r => {
      resolveTask = r;
    });
    this.runningTasks.set(run.id, { promise: taskPromise, abortController });

    try {
      await this.store.updateRun(run.id, rb.start());

      const streamMessages: AgentStreamMessage[] = [];
      for await (const msg of this.executor.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) {
          // Run was cancelled externally — re-read store for the latest state
          const latest = await this.store.getRun(run.id);
          return RunBuilder.fromRecord(latest).snapshot();
        }
        streamMessages.push(msg);
      }

      const { output, usage } = MessageConverter.extractFromStreamMessages(streamMessages, run.id);

      // Append messages first so that if updateRun fails the run stays in_progress
      // and can be retried, rather than showing completed with missing thread history.
      // TODO(atomicity): for full consistency, add an aggregate store method
      // (e.g. completeRunWithMessages) that wraps both writes in a single transaction.
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toInputMessageObjects(input.input.messages, threadId),
        ...output,
      ]);

      await this.store.updateRun(run.id, rb.complete(output, usage));

      return rb.snapshot();
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        // Cancelled — re-read store for the latest state
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
    // where the IIFE's finally block deletes the entry before it is set.
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>(r => {
      resolveTask = r;
    });
    this.runningTasks.set(run.id, { promise: taskPromise, abortController });

    (async () => {
      try {
        await this.store.updateRun(run.id, rb.start());

        const streamMessages: AgentStreamMessage[] = [];
        for await (const msg of this.executor.execRun(input, abortController.signal)) {
          if (abortController.signal.aborted) return;
          streamMessages.push(msg);
        }

        // Check if another worker has cancelled this run before writing final state
        const currentRun = await this.store.getRun(run.id);
        if (currentRun.status === RunStatus.Cancelling || currentRun.status === RunStatus.Cancelled) {
          return;
        }

        const { output, usage } = MessageConverter.extractFromStreamMessages(streamMessages, run.id);

        // Append messages before marking run as completed — see syncRun comment.
        // TODO(atomicity): add aggregate store method for full transactional guarantee.
        await this.store.appendMessages(threadId, [
          ...MessageConverter.toInputMessageObjects(input.input.messages, threadId),
          ...output,
        ]);

        await this.store.updateRun(run.id, rb.complete(output, usage));
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          // Check store before writing failed state — another worker may have cancelled
          try {
            const currentRun = await this.store.getRun(run.id);
            if (currentRun.status !== RunStatus.Cancelling && currentRun.status !== RunStatus.Cancelled) {
              await this.store.updateRun(run.id, rb.fail(err as Error));
            }
          } catch (storeErr) {
            // TODO: need a background expiry mechanism to clean up runs stuck in non-terminal states
            // (e.g. in_progress or cancelling) when store writes fail persistently.
            this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
          }
        } else {
          this.logger.error('[AgentRuntime] execRun error during abort:', err);
        }
      } finally {
        resolveTask();
        this.runningTasks.delete(run.id);
      }
    })();

    return queuedSnapshot;
  }

  /**
   * Start a streaming run with background execution.
   * The task continues running even if the SSE client disconnects.
   * Events are buffered in memory for reconnection support.
   */
  async streamRun(input: CreateRunInput, writer: SSEWriter): Promise<void> {
    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    // Create event buffer for this run
    const buffer: RunEventBuffer = {
      events: [],
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
    this.runningTasks.set(run.id, { promise: taskPromise, abortController });

    this.executeStreamBackground(input, run.id, threadId, rb, buffer, abortController)
      .finally(() => {
        resolveTask();
        this.runningTasks.delete(run.id);
        // Schedule buffer cleanup after TTL
        buffer.cleanupTimer = setTimeout(() => {
          this.runBuffers.delete(run.id);
        }, BUFFER_TTL_MS);
      });

    // Stream events to the current client
    await this.streamEventsToWriter(buffer, writer, 0);
  }

  /**
   * Reconnect to a running or completed run's event stream.
   * Replays events after lastEventId, then continues real-time if still running.
   */
  async reconnectStream(runId: string, writer: SSEWriter, lastEventId: number = 0): Promise<void> {
    const buffer = this.runBuffers.get(runId);
    if (!buffer) {
      throw new AgentNotFoundError(`Run event buffer not found: ${runId}`);
    }
    await this.streamEventsToWriter(buffer, writer, lastEventId);
  }

  /**
   * Push a new event into the run buffer and notify subscribers.
   */
  private pushEvent(buffer: RunEventBuffer, type: string, data: unknown): void {
    const event: StreamEvent = {
      seq: ++buffer.lastSeq,
      type,
      data,
      ts: Date.now(),
    };
    buffer.events.push(event);
    buffer.emitter.emit('event');
  }

  /**
   * Execute the run in the background, buffering events as StreamEvent objects.
   * Store operations (createRun, updateRun, appendMessages) are preserved.
   */
  private async executeStreamBackground(
    input: CreateRunInput,
    runId: string,
    threadId: string,
    rb: RunBuilder,
    buffer: RunEventBuffer,
    abortController: AbortController,
  ): Promise<void> {
    try {
      await this.store.updateRun(runId, rb.start());

      const streamMessages: AgentStreamMessage[] = [];

      for await (const msg of this.executor.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) {
          rb.cancelling();
          try {
            await this.store.updateRun(runId, rb.cancel());
          } catch (storeErr) {
            this.logger.error('[AgentRuntime] failed to write cancelled status during stream abort:', storeErr);
          }
          this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
          return;
        }

        streamMessages.push(msg);

        // Skip keepalive — heartbeat is handled by streamEventsToWriter
        const eventType = msg.type || 'message';
        if (eventType === 'keepalive') continue;

        // Use raw data if provided, otherwise construct from message fields
        const eventData = msg.raw ?? {
          ...(msg.type ? { type: msg.type } : {}),
          ...(msg.message ? { message: msg.message } : {}),
          ...(msg.usage ? { usage: msg.usage } : {}),
        };
        this.pushEvent(buffer, eventType, eventData);
      }

      // Persist to store (same as syncRun/asyncRun)
      const { output, usage } = MessageConverter.extractFromStreamMessages(streamMessages, runId);
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toInputMessageObjects(input.input.messages, threadId),
        ...output,
      ]);
      await this.store.updateRun(runId, rb.complete(output, usage));

      this.pushEvent(buffer, 'done', { result: 'success', runId });
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        rb.cancelling();
        try {
          await this.store.updateRun(runId, rb.cancel());
        } catch (storeErr) {
          this.logger.error('[AgentRuntime] failed to write cancelled status during stream error:', storeErr);
        }
        this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
      } else {
        try {
          await this.store.updateRun(runId, rb.fail(err as Error));
        } catch (storeErr) {
          this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
        }
        this.pushEvent(buffer, 'error', { message: (err as Error).message, runId });
      }
    } finally {
      buffer.done = true;
      buffer.emitter.emit('event');
    }
  }

  /**
   * Stream buffered events to an SSE writer with replay and real-time phases.
   * Phase 1: Replay — send all events with seq > lastEventId
   * Phase 2: Real-time — listen for new events until the run completes or client disconnects
   * Heartbeat comments (`: keepalive`) are sent every 10 seconds during the real-time phase.
   */
  private async streamEventsToWriter(
    buffer: RunEventBuffer,
    writer: SSEWriter,
    lastEventId: number,
  ): Promise<void> {
    // Phase 1: Replay buffered events
    for (const event of buffer.events) {
      if (event.seq <= lastEventId) continue;
      if (writer.closed) return;
      writer.writeEvent(event.type, event);
    }

    // If already done, end the stream
    if (buffer.done) {
      if (!writer.closed) writer.end();
      return;
    }

    // Phase 2: Real-time events + heartbeat
    let lastWrittenSeq = buffer.events.length > 0
      ? buffer.events[buffer.events.length - 1].seq
      : lastEventId;

    await new Promise<void>(resolve => {
      let heartbeatTimer: ReturnType<typeof setTimeout>;

      const writeNewEvents = (): void => {
        for (const event of buffer.events) {
          if (event.seq <= lastWrittenSeq) continue;
          if (writer.closed) break;
          writer.writeEvent(event.type, event);
          lastWrittenSeq = event.seq;
        }
      };

      const onEvent = (): void => {
        writeNewEvents();
        resetHeartbeat();
        if (buffer.done) {
          cleanup();
          resolve();
        }
      };

      const resetHeartbeat = (): void => {
        clearTimeout(heartbeatTimer);
        heartbeatTimer = setTimeout(onHeartbeat, HEARTBEAT_INTERVAL_MS);
      };

      const onHeartbeat = (): void => {
        if (writer.closed) {
          cleanup();
          resolve();
          return;
        }
        writer.writeComment('keepalive');
        resetHeartbeat();
      };

      const cleanup = (): void => {
        clearTimeout(heartbeatTimer);
        buffer.emitter.off('event', onEvent);
      };

      writer.onClose(() => {
        cleanup();
        resolve();
      });

      buffer.emitter.on('event', onEvent);
      resetHeartbeat();
    });

    if (!writer.closed) writer.end();
  }

  async getRun(runId: string): Promise<RunObject> {
    const run = await this.store.getRun(runId);
    return RunBuilder.fromRecord(run).snapshot();
  }

  async cancelRun(runId: string): Promise<RunObject> {
    // 1. Check current status — reject if already terminal
    const run = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(run.status)) {
      throw new AgentConflictError(`Cannot cancel run with status '${run.status}'`);
    }

    const rb = RunBuilder.fromRecord(run);

    // 2. Write "cancelling" to store first — visible to all workers
    await this.store.updateRun(runId, rb.cancelling());

    // 3. If the task is running locally, abort it for immediate effect
    const task = this.runningTasks.get(runId);
    if (task) {
      task.abortController.abort();
      await task.promise.catch(() => {
        /* ignore */
      });
    }

    // 4. Re-read store to mitigate TOCTOU: if the run completed/failed between
    //    steps 2 and 4, do not overwrite the terminal state.
    // TODO: For full atomicity, use CAS / ETag-based conditional writes.
    const freshRun = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(freshRun.status)) {
      // Run reached a terminal state while we were cancelling — return as-is
      return RunBuilder.fromRecord(freshRun).snapshot();
    }

    // 5. Transition to final "cancelled" state
    try {
      await this.store.updateRun(runId, rb.cancel());
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to write cancelled state after cancelling:', err);
      // Return best-effort snapshot from store
      const fallback = await this.store.getRun(runId);
      return RunBuilder.fromRecord(fallback).snapshot();
    }

    return rb.snapshot();
  }

  /** Wait for all in-flight background tasks to complete naturally (without aborting). */
  async waitForPendingTasks(): Promise<void> {
    if (this.runningTasks.size) {
      const pending = Array.from(this.runningTasks.values()).map(t => t.promise);
      await Promise.allSettled(pending);
    }
  }

  async destroy(): Promise<void> {
    // Abort all in-flight background tasks, then wait for them to settle
    for (const task of this.runningTasks.values()) {
      task.abortController.abort();
    }
    await this.waitForPendingTasks();

    // Clean up all run buffers and their timers
    for (const buffer of this.runBuffers.values()) {
      if (buffer.cleanupTimer) clearTimeout(buffer.cleanupTimer);
      buffer.emitter.removeAllListeners();
    }
    this.runBuffers.clear();

    // Destroy store
    if (this.store.destroy) {
      await this.store.destroy();
    }
  }

  /** Factory method — avoids the spread-arg type issue with dynamic delegation. */
  static create(options: AgentRuntimeOptions): AgentRuntime {
    return new AgentRuntime(options);
  }
}
