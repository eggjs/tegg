import { EventEmitter } from 'node:events';
import { appendFileSync, createReadStream, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

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
const EVENT_DIR = join(tmpdir(), 'agent-runtime-events');

interface RunEventBuffer {
  filePath: string;
  lastSeq: number;
  done: boolean;
  emitter: EventEmitter;
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
    this.runningTasks.set(run.id, { promise: taskPromise, abortController });

    this.executeStreamBackground(input, run.id, threadId, rb, buffer, abortController)
      .finally(() => {
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
      // Task still running — use live buffer (emitter + file)
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

  /**
   * Push a new event: persist to JSONL file and notify subscribers via EventEmitter.
   */
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

      // Check if another worker has cancelled this run before writing final state
      const currentRun = await this.store.getRun(runId);
      if (currentRun.status === RunStatus.Cancelling || currentRun.status === RunStatus.Cancelled) {
        this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
        return;
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
      if (!abortController.signal.aborted) {
        // Check store before writing failed state — another worker may have cancelled
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
        this.logger.error('[AgentRuntime] execRun error during abort:', err);
        this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
      }
    } finally {
      buffer.done = true;
      buffer.emitter.emit('event');
    }
  }

  /**
   * Read events from JSONL file, yielding those with seq > afterSeq.
   */
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

  /**
   * Stream events to an SSE writer with replay and real-time phases.
   * Phase 1: Replay — read JSONL file, send events with seq > lastSeq
   * Phase 2: Real-time — listen to EventEmitter until the run completes or client disconnects
   * Heartbeat comments (`: keepalive`) are sent every 10 seconds during the real-time phase.
   */
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

    // If already done, end the stream
    if (buffer.done) {
      if (!writer.closed) writer.end();
      return;
    }

    // Phase 2: Real-time events via EventEmitter + heartbeat
    // Events emitted between file read and listener registration are caught
    // by re-reading the file for any gap (catch-up), then listening real-time.
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

      // Real-time loop
      const waitForEvent = () => new Promise<'event' | 'heartbeat'>(resolve => {
        waitResolve = () => resolve('event');
        setTimeout(() => resolve('heartbeat'), HEARTBEAT_INTERVAL_MS);
      });

      while (!buffer.done || queue.length > 0) {
        // Drain queue
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

    // Clean up all run buffers (JSONL files are preserved for reconnection)
    for (const buffer of this.runBuffers.values()) {
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
