import { AccessLevel, IncomingHttpHeaders, Inject, LifecyclePostInject, ModuleConfigs, SingletonProto } from '@eggjs/tegg';
import type {
  RunCreateDTO,
  Run,
  RunKwargs,
  RunnableConfig,
  StreamMode,
  AuthContext,
} from '../../app/controller/types';
import { RunsRepository } from './RunsRepository';
import { Graph } from './Graph';
import { AssistantsInitService } from '../assistants/AssistantsInitService';


@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class RunsService {
  @Inject()
  private readonly moduleConfigs: ModuleConfigs;

  @Inject()
  private readonly runsRepository: RunsRepository;

  @Inject()
  private readonly graph: Graph;

  @Inject()
  private readonly assistantsInitService: AssistantsInitService;

  private agentConfigs: Map<string, { moduleName: string; config: any }>;

  @LifecyclePostInject()
  protected async init() {
    this.agentConfigs = new Map();
    for (const [ moduleName, moduleInfo ] of this.moduleConfigs) {
      if (moduleInfo.config.agents) {
        const agents = moduleInfo.config.agents || {};
        for (const [ agentName, agentConfig ] of Object.entries(agents)) {
          this.agentConfigs.set(agentName, { moduleName, config: agentConfig });
        }
      }
    }
  }

  public getAllAgentConfigs() {
    return this.agentConfigs;
  }

  /**
   * 创建并验证一个 Run
   * 从 langgraphjs/libs/langgraph-api/src/api/runs.mts 的 createValidRun 移植
   */
  public async createValidRun(
    threadId: string | undefined,
    payload: RunCreateDTO,
    kwargs: {
      auth?: AuthContext;
      headers?: IncomingHttpHeaders;
    } = {},
  ): Promise<Run> {
    const { assistant_id: assistantId, ...run } = payload;
    const { auth, headers } = kwargs;

    // 验证 assistant 是否存在
    const assistant = await this.assistantsInitService.getAssistant(assistantId);
    if (!assistant) {
      throw new Error(`Assistant "${assistantId}" not found`);
    }

    console.log('📊 Creating run for assistant:', {
      assistantId,
      graphId: assistant.graph_id,
      name: assistant.name,
    });

    // 获取对应的 graph
    const graph = this.graph.getGraph(assistant.graph_id);
    console.log('---> graph instance', graph);

    // 生成 run_id
    const runId = this.generateRunId();

    // 处理 stream_mode
    const streamMode = Array.isArray(payload.stream_mode)
      ? payload.stream_mode
      : payload.stream_mode != null
        ? [ payload.stream_mode ]
        : [];
    if (streamMode.length === 0) streamMode.push('values');

    const multitaskStrategy = payload.multitask_strategy ?? 'reject';
    const preventInsertInInflight = multitaskStrategy === 'reject';

    // 构建 config
    const config: RunnableConfig = { ...run.config };

    // 处理 checkpoint_id
    if (run.checkpoint_id) {
      config.configurable ??= {};
      config.configurable.checkpoint_id = run.checkpoint_id;
    }

    // 处理 checkpoint
    if (run.checkpoint) {
      config.configurable ??= {};
      Object.assign(config.configurable, run.checkpoint);
    }

    // 处理 langsmith_tracer
    if (run.langsmith_tracer) {
      config.configurable ??= {};
      Object.assign(config.configurable, {
        langsmith_project: run.langsmith_tracer.project_name,
        langsmith_example_id: run.langsmith_tracer.example_id,
      });
    }

    // 处理 headers（提取 x- 开头的自定义 header）
    if (headers) {
      for (const [ rawKey, value ] of Object.entries(headers)) {
        if (!value) continue; // 跳过 undefined 值
        const key = rawKey.toLowerCase();
        if (key.startsWith('x-')) {
          // 跳过敏感的 API keys
          if ([ 'x-api-key', 'x-tenant-id', 'x-service-key' ].includes(key)) {
            continue;
          }

          config.configurable ??= {};
          // 如果是数组，取第一个值
          config.configurable[key] = Array.isArray(value) ? value[0] : value;
        } else if (key === 'user-agent') {
          config.configurable ??= {};
          config.configurable[key] = Array.isArray(value) ? value[0] : value;
        }
      }
    }

    // 处理认证信息
    let userId: string | undefined;
    if (auth) {
      userId = auth.user.identity ?? auth.user.id;
      config.configurable ??= {};
      config.configurable.langgraph_auth_user = auth.user;
      config.configurable.langgraph_auth_user_id = userId;
      config.configurable.langgraph_auth_permissions = auth.scopes;
    }

    // 处理 feedback_keys
    let feedbackKeys =
      run.feedback_keys != null
        ? Array.isArray(run.feedback_keys)
          ? run.feedback_keys
          : [ run.feedback_keys ]
        : undefined;
    if (!feedbackKeys?.length) feedbackKeys = undefined;

    // 构建 RunKwargs
    const runKwargs: RunKwargs = {
      input: run.input,
      command: run.command,
      config,
      context: run.context,
      stream_mode: streamMode as StreamMode[],
      interrupt_before: run.interrupt_before,
      interrupt_after: run.interrupt_after,
      webhook: run.webhook,
      feedback_keys: feedbackKeys,
      temporary:
        threadId == null && (run.on_completion ?? 'delete') === 'delete',
      subgraphs: run.stream_subgraphs ?? false,
      resumable: run.stream_resumable ?? false,
    };

    // 存储 Run 到仓库
    const [ first, ...inflight ] = await this.runsRepository.put(
      runId,
      assistantId,
      runKwargs,
      {
        threadId,
        userId,
        metadata: run.metadata,
        status: 'pending',
        multitaskStrategy,
        preventInsertInInflight,
        afterSeconds: payload.after_seconds,
        ifNotExists: payload.if_not_exists,
      },
      auth,
    );

    // 处理创建成功的情况
    if (first?.run_id === runId) {
      console.log('Created run', { run_id: runId, thread_id: threadId });

      // 处理 multitask_strategy: interrupt 或 rollback
      if (
        (multitaskStrategy === 'interrupt' || multitaskStrategy === 'rollback') &&
        inflight.length > 0
      ) {
        try {
          await this.runsRepository.cancel(
            threadId,
            inflight.map(run => run.run_id),
            { action: multitaskStrategy },
            auth,
          );
        } catch (error) {
          console.warn(
            'Failed to cancel inflight runs, might be already cancelled',
            {
              error,
              run_ids: inflight.map(run => run.run_id),
              thread_id: threadId,
            },
          );
        }
      }

      return first;
    } else if (multitaskStrategy === 'reject') {
      // 如果 multitask_strategy 是 reject，且有冲突，抛出错误
      throw new Error(
        'Thread is already running a task. Wait for it to finish or choose a different multitask strategy.',
      );
    }

    throw new Error('Unreachable state when creating run');
  }

  /**
   * 获取 Run
   */
  public async getRun(
    runId: string,
    threadId: string | undefined,
    auth?: AuthContext,
  ): Promise<Run | null> {
    return this.runsRepository.get(runId, threadId, auth);
  }

  /**
   * 删除 Run
   */
  public async deleteRun(
    runId: string,
    threadId: string | undefined,
    auth?: AuthContext,
  ): Promise<string | null> {
    return this.runsRepository.delete(runId, threadId, auth);
  }

  /**
   * 搜索 Runs
   */
  public async searchRuns(
    threadId: string,
    options: {
      limit?: number | null;
      offset?: number | null;
      status?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    auth?: AuthContext,
  ): Promise<Run[]> {
    return this.runsRepository.search(threadId, options, auth);
  }

  /**
   * 生成 run_id
   * 简单版本，实际项目中可能需要使用 uuid
   */
  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

}


// export const getAssistantId = (graphId: string) => {
//   if (graphId in GRAPHS) return uuid.v5(graphId, NAMESPACE_GRAPH);
//   return graphId;
// };
