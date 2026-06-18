import type { RunObject, RunRecord, AgentRunConfig } from '@eggjs/tegg-types/agent-runtime';
import { RunStatus, AgentErrorCode, AgentObjectType, InvalidRunStateTransitionError } from '@eggjs/tegg-types/agent-runtime';

import { nowMs, nowUnix } from './AgentStoreUtils';

/** Accumulated token usage — same shape as non-null RunRecord['usage']. */
export type RunUsage = NonNullable<RunRecord['usage']>;

/**
 * Encapsulates run state transitions.
 *
 * Mutation methods (`start`, `complete`, `fail`, `cancel`) update internal
 * state and return `Partial<RunRecord>` for the store.
 *
 * `snapshot()` produces a `RunObject` suitable for API responses and SSE events.
 */
export class RunBuilder {
  private readonly id: string;
  private readonly threadId: string;
  private readonly createdAt: number;
  private readonly metadata?: Record<string, unknown>;
  private readonly config?: AgentRunConfig;

  private status: RunStatus;
  private startedAt?: number;
  private completedAt?: number;
  private cancelledAt?: number;
  private failedAt?: number;
  // ms-granular timing: absolute epoch-ms points (startedAtMs/completedAtMs) and durations (durationMs/apiDurationMs).
  private startedAtMs?: number;
  private completedAtMs?: number;
  private durationMs?: number | null;
  private apiDurationMs?: number | null;
  private lastError?: { code: string; message: string } | null;
  private usage?: RunUsage;

  private constructor(
    id: string,
    threadId: string,
    createdAt: number,
    status: RunStatus,
    metadata?: Record<string, unknown>,
    config?: AgentRunConfig,
  ) {
    this.id = id;
    this.threadId = threadId;
    this.createdAt = createdAt;
    this.status = status;
    this.metadata = metadata;
    this.config = config;
  }

  /** Create a RunBuilder from a store RunRecord, using its own threadId. */
  static fromRecord(run: RunRecord): RunBuilder {
    return RunBuilder.create(run, run.threadId ?? '');
  }

  /** Create a RunBuilder from a store RunRecord, restoring all mutable state. */
  static create(run: RunRecord, threadId: string): RunBuilder {
    const rb = new RunBuilder(run.id, threadId, run.createdAt, run.status, run.metadata, run.config);
    rb.startedAt = run.startedAt ?? undefined;
    rb.completedAt = run.completedAt ?? undefined;
    rb.cancelledAt = run.cancelledAt ?? undefined;
    rb.failedAt = run.failedAt ?? undefined;
    rb.startedAtMs = run.startedAtMs ?? undefined;
    rb.completedAtMs = run.completedAtMs ?? undefined;
    rb.durationMs = run.durationMs ?? undefined;
    rb.apiDurationMs = run.apiDurationMs ?? undefined;
    rb.lastError = run.lastError ?? undefined;
    if (run.usage) {
      rb.usage = { ...run.usage };
    }
    return rb;
  }

  /** queued -> in_progress. Returns store update. */
  start(): Partial<RunRecord> {
    if (this.status !== RunStatus.Queued) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.InProgress);
    }
    this.status = RunStatus.InProgress;
    // Derive the seconds field from the same ms reading so the two never disagree across a second boundary.
    this.startedAtMs = nowMs();
    this.startedAt = Math.floor(this.startedAtMs / 1000);
    return { status: this.status, startedAt: this.startedAt, startedAtMs: this.startedAtMs };
  }

  /**
   * in_progress -> completed. Returns store update.
   *
   * `apiDurationMs` is the run's summed pure-model-API time (from result
   * messages' `duration_api_ms`); pass undefined when no result carried it.
   * `durationMs` is derived as `completedAtMs - startedAtMs` (null if the run
   * was restored without a startedAtMs).
   */
  complete(usage?: RunUsage, apiDurationMs?: number): Partial<RunRecord> {
    if (this.status !== RunStatus.InProgress) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Completed);
    }
    this.status = RunStatus.Completed;
    // Derive the seconds field from the same ms reading so the two never disagree across a second boundary.
    this.completedAtMs = nowMs();
    this.completedAt = Math.floor(this.completedAtMs / 1000);
    this.durationMs = this.startedAtMs != null ? this.completedAtMs - this.startedAtMs : null;
    this.apiDurationMs = apiDurationMs ?? null;
    this.usage = usage;
    return {
      status: this.status,
      usage,
      completedAt: this.completedAt,
      completedAtMs: this.completedAtMs,
      durationMs: this.durationMs,
      apiDurationMs: this.apiDurationMs,
    };
  }

  /**
   * queued/in_progress/cancelling -> failed. Returns store update.
   *
   * `cancelling -> failed` covers the case where AgentRuntime has initiated
   * a cancel but the watchdog times out before the executor commits — the
   * run is treated as a failed startup rather than a successful cancel.
   */
  fail(error: Error): Partial<RunRecord> {
    if (
      this.status !== RunStatus.InProgress &&
      this.status !== RunStatus.Queued &&
      this.status !== RunStatus.Cancelling
    ) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Failed);
    }
    this.status = RunStatus.Failed;
    this.failedAt = nowUnix();
    this.lastError = { code: AgentErrorCode.ExecError, message: error.message };
    return {
      status: this.status,
      lastError: this.lastError,
      failedAt: this.failedAt,
    };
  }

  /** in_progress/queued -> cancelling (idempotent if already cancelling). Returns store update. */
  cancelling(): Partial<RunRecord> {
    if (this.status === RunStatus.Cancelling) {
      return { status: this.status };
    }
    if (this.status !== RunStatus.InProgress && this.status !== RunStatus.Queued) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Cancelling);
    }
    this.status = RunStatus.Cancelling;
    return { status: this.status };
  }

  /** cancelling -> cancelled. Returns store update. */
  cancel(): Partial<RunRecord> {
    if (this.status !== RunStatus.Cancelling) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Cancelled);
    }
    this.status = RunStatus.Cancelled;
    this.cancelledAt = nowUnix();
    return {
      status: this.status,
      cancelledAt: this.cancelledAt,
    };
  }

  /** Produce a RunObject snapshot for API / SSE. */
  snapshot(): RunObject {
    return {
      id: this.id,
      object: AgentObjectType.ThreadRun,
      createdAt: this.createdAt,
      threadId: this.threadId,
      status: this.status,
      lastError: this.lastError,
      startedAt: this.startedAt ?? null,
      completedAt: this.completedAt ?? null,
      cancelledAt: this.cancelledAt ?? null,
      failedAt: this.failedAt ?? null,
      startedAtMs: this.startedAtMs ?? null,
      completedAtMs: this.completedAtMs ?? null,
      durationMs: this.durationMs ?? null,
      apiDurationMs: this.apiDurationMs ?? null,
      usage: this.usage ?? null,
      metadata: this.metadata,
      config: this.config,
    };
  }
}
