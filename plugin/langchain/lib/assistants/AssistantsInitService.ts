/* eslint-disable @typescript-eslint/no-unused-vars */
import { AccessLevel, Inject, LifecyclePostInject, ModuleConfigs, SingletonProto } from '@eggjs/tegg';
import { GraphInfoUtil } from '@eggjs/tegg-langchain-decorator';
import { AssistantsRepository } from './AssistantsRepository';
import { v5 as uuidv5, parse as uuidParse } from 'uuid';

/**
 * UUID Namespace for generating assistant IDs
 * 使用与 langgraphjs 相同的 namespace
 */
const NAMESPACE_GRAPH = uuidParse('6ba7b821-9dad-11d1-80b4-00c04fd430c8');

/**
 * Assistants 初始化服务
 * 在应用启动时，从 GraphInfoUtil 和 moduleConfigs 中加载所有 graphs
 * 并将它们注册为 assistants
 *
 * 参考: langgraphjs/libs/langgraph-api/src/graph/load.mts 的 registerFromEnv
 */
@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class AssistantsInitService {
  @Inject()
  private readonly moduleConfigs: ModuleConfigs;

  @Inject()
  private readonly assistantsRepository: AssistantsRepository;

  @LifecyclePostInject()
  protected async init() {
    console.log('🚀 Initializing Assistants from GraphInfoUtil and moduleConfigs...');

    // 1. 从 GraphInfoUtil 加载所有注册的 graphs
    await this.registerGraphsFromUtil();

    // 2. 从 moduleConfigs 加载 agents 配置
    await this.registerGraphsFromModuleConfigs();

    // 3. 输出注册的 assistants
    const allAssistants = this.assistantsRepository.getAll();
    console.log(`✅ Registered ${allAssistants.length} assistants:`);
    allAssistants.forEach(assistant => {
      console.log(`   - ${assistant.name} (graph_id: ${assistant.graph_id}, assistant_id: ${assistant.assistant_id})`);
    });
  }

  /**
   * 从 GraphInfoUtil 注册所有 graphs
   */
  private async registerGraphsFromUtil() {
    const graphMap = GraphInfoUtil.getAllGraphMetadata();

    for (const [ _clazz, metadata ] of graphMap.entries()) {
      if (!metadata.name) {
        console.warn('⚠️  Graph metadata missing name, skipping registration');
        continue;
      }

      const graphId = metadata.name;
      const assistantId = this.generateAssistantId(graphId);

      console.log(`📦 Registering graph from GraphInfoUtil: ${graphId}`);

      await this.assistantsRepository.put(
        assistantId,
        {
          graph_id: graphId,
          metadata: {
            created_by: 'system',
            source: 'GraphInfoUtil',
          },
          config: {},
          context: undefined,
          if_exists: 'do_nothing',
          name: graphId,
          description: `Graph loaded from GraphInfoUtil: ${graphId}`,
        },
        undefined,
      );
    }
  }

  /**
   * 从 moduleConfigs 注册 agents 配置中的 graphs
   */
  private async registerGraphsFromModuleConfigs() {
    for (const [ moduleName, moduleInfo ] of this.moduleConfigs) {
      if (!moduleInfo.config.agents) continue;

      const agents = moduleInfo.config.agents || {};

      for (const [ agentName, agentConfig ] of Object.entries(agents)) {
        const graphId = agentName;
        const assistantId = this.generateAssistantId(graphId);

        console.log(`📦 Registering graph from moduleConfigs: ${graphId} (module: ${moduleName})`);

        await this.assistantsRepository.put(
          assistantId,
          {
            graph_id: graphId,
            metadata: {
              created_by: 'system',
              source: 'moduleConfigs',
              module: moduleName,
            },
            config: agentConfig as any,
            context: undefined,
            if_exists: 'do_nothing',
            name: graphId,
            description: `Graph loaded from moduleConfigs (module: ${moduleName})`,
          },
          undefined,
        );
      }
    }
  }

  /**
   * 生成 assistant_id
   * 使用与 langgraphjs 相同的方式: uuid.v5(graphId, NAMESPACE_GRAPH)
   */
  private generateAssistantId(graphId: string): string {
    return uuidv5(graphId, NAMESPACE_GRAPH);
  }

  /**
   * 根据 graphId 获取 assistantId
   */
  public getAssistantId(graphId: string): string {
    return this.generateAssistantId(graphId);
  }

  /**
   * 根据 assistantId 获取 assistant
   */
  public async getAssistant(assistantId: string) {
    return this.assistantsRepository.get(assistantId);
  }

  /**
   * 根据 graphId 获取 assistant
   */
  public async getAssistantByGraphId(graphId: string) {
    return this.assistantsRepository.getByGraphId(graphId);
  }
}
