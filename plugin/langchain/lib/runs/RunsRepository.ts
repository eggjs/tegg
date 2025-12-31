/* eslint-disable @typescript-eslint/no-unused-vars */
import { AccessLevel, SingletonProto } from '@eggjs/tegg';
import type {
  Run,
  RunKwargs,
  RunStatus,
  Metadata,
  MultitaskStrategy,
  IfNotExists,
  AuthContext,
} from '../../app/controller/types';

export interface RunsPutOptions {
  threadId?: string;
  userId?: string;
  status?: RunStatus;
  metadata?: Metadata;
  preventInsertInInflight?: boolean;
  multitaskStrategy?: MultitaskStrategy;
  ifNotExists?: IfNotExists;
  afterSeconds?: number;
}

/**
 * Runs 存储层接口
 * 从 langgraphjs/libs/langgraph-api/src/storage/types.mts 的 RunsRepo 移植
 */
export interface IRunsRepository {
  put(
    runId: string,
    assistantId: string,
    kwargs: RunKwargs,
    options: RunsPutOptions,
    auth: AuthContext | undefined,
  ): Promise<Run[]>;

  get(
    runId: string,
    threadId: string | undefined,
    auth: AuthContext | undefined,
  ): Promise<Run | null>;

  delete(
    runId: string,
    threadId: string | undefined,
    auth: AuthContext | undefined,
  ): Promise<string | null>;

  cancel(
    threadId: string | undefined,
    runIds: string[],
    options: {
      action?: 'interrupt' | 'rollback';
    },
    auth: AuthContext | undefined,
  ): Promise<void>;

  search(
    threadId: string,
    options: {
      limit?: number | null;
      offset?: number | null;
      status?: string | null;
      metadata?: Metadata | null;
    },
    auth: AuthContext | undefined,
  ): Promise<Run[]>;
}

/**
 * 内存版本的 Runs 存储实现
 * TODO: 后续可替换为数据库实现（如 PostgreSQL, MongoDB 等）
 */
@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class RunsRepository implements IRunsRepository {
  // 存储所有 runs: Map<runId, Run>
  private runs: Map<string, Run> = new Map();

  // 按 threadId 索引: Map<threadId, Set<runId>>
  private runsByThread: Map<string, Set<string>> = new Map();

  /**
   * 创建并存储一个 Run
   * 返回数组：[新创建的 run, ...冲突的 inflight runs]
   */
  async put(
    runId: string,
    assistantId: string,
    kwargs: RunKwargs,
    options: RunsPutOptions,
    _auth: AuthContext | undefined,
  ): Promise<Run[]> {
    const {
      threadId,
      status = 'pending',
      metadata = {},
      preventInsertInInflight = false,
      multitaskStrategy = 'reject',
      ifNotExists,
    } = options;

    // 检查是否已存在
    if (ifNotExists === 'reject' && this.runs.has(runId)) {
      // 如果设置了 ifNotExists=reject，且 run 已存在，则返回空数组
      return [];
    }

    // 如果有 threadId，查找该 thread 下正在运行的 runs
    const inflightRuns: Run[] = [];
    if (threadId && preventInsertInInflight) {
      const threadRunIds = this.runsByThread.get(threadId) || new Set();
      for (const existingRunId of threadRunIds) {
        const existingRun = this.runs.get(existingRunId);
        if (
          existingRun &&
          (existingRun.status === 'pending' || existingRun.status === 'running')
        ) {
          inflightRuns.push(existingRun);
        }
      }
    }

    // 创建新的 Run
    const now = new Date();
    const run: Run = {
      run_id: runId,
      thread_id: threadId || '',
      assistant_id: assistantId,
      created_at: now,
      updated_at: now,
      status,
      metadata,
      kwargs,
      multitask_strategy: multitaskStrategy,
    };

    // 存储 run
    this.runs.set(runId, run);

    // 更新 threadId 索引
    if (threadId) {
      if (!this.runsByThread.has(threadId)) {
        this.runsByThread.set(threadId, new Set());
      }
      this.runsByThread.get(threadId)!.add(runId);
    }

    // 返回 [新 run, ...冲突的 runs]
    return [ run, ...inflightRuns ];
  }

  async get(
    runId: string,
    threadId: string | undefined,
    _auth: AuthContext | undefined,
  ): Promise<Run | null> {
    const run = this.runs.get(runId);
    if (!run) return null;

    // 如果指定了 threadId，验证是否匹配
    if (threadId && run.thread_id !== threadId) {
      return null;
    }

    return run;
  }

  async delete(
    runId: string,
    threadId: string | undefined,
    _auth: AuthContext | undefined,
  ): Promise<string | null> {
    const run = this.runs.get(runId);
    if (!run) return null;

    // 如果指定了 threadId，验证是否匹配
    if (threadId && run.thread_id !== threadId) {
      return null;
    }

    // 删除 run
    this.runs.delete(runId);

    // 从 threadId 索引中删除
    if (run.thread_id) {
      const threadRuns = this.runsByThread.get(run.thread_id);
      if (threadRuns) {
        threadRuns.delete(runId);
        if (threadRuns.size === 0) {
          this.runsByThread.delete(run.thread_id);
        }
      }
    }

    return runId;
  }

  async cancel(
    threadId: string | undefined,
    runIds: string[],
    _options: {
      action?: 'interrupt' | 'rollback';
    },
    _auth: AuthContext | undefined,
  ): Promise<void> {
    for (const runId of runIds) {
      const run = this.runs.get(runId);
      if (!run) continue;

      // 如果指定了 threadId，验证是否匹配
      if (threadId && run.thread_id !== threadId) {
        continue;
      }

      // 更新状态为 interrupted
      run.status = 'interrupted';
      run.updated_at = new Date();
    }
  }

  async search(
    threadId: string,
    options: {
      limit?: number | null;
      offset?: number | null;
      status?: string | null;
      metadata?: Metadata | null;
    },
    _auth: AuthContext | undefined,
  ): Promise<Run[]> {
    const { limit = 10, offset = 0, status, metadata } = options;

    // 获取该 thread 下的所有 runs
    const threadRunIds = this.runsByThread.get(threadId);
    if (!threadRunIds) return [];

    const results: Run[] = [];
    for (const runId of threadRunIds) {
      const run = this.runs.get(runId);
      if (!run) continue;

      // 过滤状态
      if (status && run.status !== status) continue;

      // 过滤 metadata（简单版本：检查所有 key 是否匹配）
      if (metadata) {
        let metadataMatch = true;
        for (const [ key, value ] of Object.entries(metadata)) {
          if (run.metadata[key] !== value) {
            metadataMatch = false;
            break;
          }
        }
        if (!metadataMatch) continue;
      }

      results.push(run);
    }

    // 按创建时间倒序排列
    results.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    // 分页
    const start = offset || 0;
    const end = limit ? start + limit : results.length;
    return results.slice(start, end);
  }

  /**
   * 更新 run 状态
   */
  async setStatus(runId: string, status: RunStatus): Promise<void> {
    const run = this.runs.get(runId);
    if (run) {
      run.status = status;
      run.updated_at = new Date();
    }
  }
}
