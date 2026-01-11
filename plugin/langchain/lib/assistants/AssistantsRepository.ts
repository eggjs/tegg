import { AccessLevel, SingletonProto } from '@eggjs/tegg';
import type {
  Assistant,
  Metadata,
  RunnableConfig,
  OnConflictBehavior,
  AuthContext,
} from '../../app/controller/types';

export interface AssistantsPutOptions {
  config?: RunnableConfig;
  context?: unknown;
  graph_id: string;
  metadata?: Metadata;
  if_exists: OnConflictBehavior;
  name?: string;
  description?: string;
}

/**
 * Assistants 存储层接口
 * 从 langgraphjs/libs/langgraph-api/src/storage/types.mts 的 AssistantsRepo 移植
 */
export interface IAssistantsRepository {
  get(assistantId: string, auth?: AuthContext): Promise<Assistant | null>;

  put(
    assistantId: string,
    options: AssistantsPutOptions,
    auth?: AuthContext,
  ): Promise<Assistant>;

  search(
    options: {
      graph_id?: string;
      name?: string;
      metadata?: Metadata;
      limit?: number;
      offset?: number;
    },
    auth?: AuthContext,
  ): Promise<Assistant[]>;

  getByGraphId(graphId: string): Promise<Assistant | null>;
}

/**
 * 内存版本的 Assistants 存储实现
 * TODO: 后续可替换为数据库实现
 */
@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class AssistantsRepository implements IAssistantsRepository {
  // 存储所有 assistants: Map<assistantId, Assistant>
  private assistants: Map<string, Assistant> = new Map();

  // 按 graph_id 索引: Map<graphId, assistantId>
  private assistantsByGraphId: Map<string, string> = new Map();

  async put(
    assistantId: string,
    options: AssistantsPutOptions,
    _auth?: AuthContext,
  ): Promise<Assistant> {
    const {
      config = {},
      context,
      graph_id: graphId,
      metadata = {},
      if_exists: ifExists,
      name,
      description = null,
    } = options;

    // 检查是否已存在
    const existing = this.assistants.get(assistantId);
    if (existing) {
      if (ifExists === 'raise') {
        throw new Error(`Assistant with id "${assistantId}" already exists`);
      } else if (ifExists === 'do_nothing') {
        return existing;
      }
    }

    const now = new Date();
    const assistant: Assistant = {
      assistant_id: assistantId,
      graph_id: graphId,
      name: name || graphId,
      description,
      config,
      context,
      metadata,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      version: (existing?.version ?? 0) + 1,
    };

    // 存储 assistant
    this.assistants.set(assistantId, assistant);
    this.assistantsByGraphId.set(graphId, assistantId);

    return assistant;
  }

  async get(assistantId: string, _auth?: AuthContext): Promise<Assistant | null> {
    return this.assistants.get(assistantId) || null;
  }

  async getByGraphId(graphId: string): Promise<Assistant | null> {
    const assistantId = this.assistantsByGraphId.get(graphId);
    if (!assistantId) return null;
    return this.assistants.get(assistantId) || null;
  }

  async search(
    options: {
      graph_id?: string;
      name?: string;
      metadata?: Metadata;
      limit?: number;
      offset?: number;
    },
    _auth?: AuthContext,
  ): Promise<Assistant[]> {
    const { graph_id, name, metadata, limit = 10, offset = 0 } = options;

    let results: Assistant[] = Array.from(this.assistants.values());

    // 过滤 graph_id
    if (graph_id) {
      results = results.filter(a => a.graph_id === graph_id);
    }

    // 过滤 name
    if (name) {
      results = results.filter(a => a.name === name);
    }

    // 过滤 metadata
    if (metadata) {
      results = results.filter(a => {
        for (const [ key, value ] of Object.entries(metadata)) {
          if (a.metadata[key] !== value) return false;
        }
        return true;
      });
    }

    // 按创建时间倒序排列
    results.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    // 分页
    return results.slice(offset, offset + limit);
  }

  /**
   * 获取所有 assistants（用于初始化检查）
   */
  getAll(): Assistant[] {
    return Array.from(this.assistants.values());
  }
}
