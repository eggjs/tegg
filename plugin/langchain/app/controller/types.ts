/**
 * LangGraph API Types
 * 从 langgraphjs/libs/langgraph-api/src/storage/types.mts 迁移
 */

export type Metadata = Record<string, unknown>;

export type AssistantSelectField =
  | 'assistant_id'
  | 'graph_id'
  | 'name'
  | 'description'
  | 'config'
  | 'context'
  | 'created_at'
  | 'updated_at'
  | 'metadata'
  | 'version';

export type ThreadSelectField =
  | 'thread_id'
  | 'created_at'
  | 'updated_at'
  | 'metadata'
  | 'config'
  | 'context'
  | 'status'
  | 'values'
  | 'interrupts';

export type ThreadStatus = 'idle' | 'busy' | 'interrupted' | 'error';

export type RunStatus =
  | 'pending'
  | 'running'
  | 'error'
  | 'success'
  | 'timeout'
  | 'interrupted';

export type StreamMode =
  | 'values'
  | 'messages'
  | 'messages-tuple'
  | 'custom'
  | 'updates'
  | 'events'
  | 'debug'
  | 'tasks'
  | 'checkpoints';

export type MultitaskStrategy = 'reject' | 'rollback' | 'interrupt' | 'enqueue';

export type OnConflictBehavior = 'raise' | 'do_nothing';

export type IfNotExists = 'create' | 'reject';

export type OnDisconnect = 'cancel' | 'continue';

export type OnCompletion = 'delete' | 'keep';

export interface RunnableConfig {
  tags?: string[];
  recursion_limit?: number;
  configurable?: {
    thread_id?: string;
    thread_ts?: string;
    checkpoint_id?: string;
    checkpoint_ns?: string;
    checkpoint_map?: Record<string, unknown>;
    langgraph_auth_user?: unknown;
    langgraph_auth_user_id?: string;
    langgraph_auth_permissions?: string[];
    langsmith_project?: string;
    langsmith_example_id?: string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
}

export interface RunCommand {
  goto?:
    | string
    | { node: string; input?: unknown }
    | Array<string | { node: string; input?: unknown }>;
  update?: Record<string, unknown> | Array<[string, unknown]>;
  resume?: unknown;
}

export interface CheckpointSchema {
  checkpoint_id?: string;
  checkpoint_ns?: string | null;
  checkpoint_map?: Record<string, unknown> | null;
}

export interface LangsmithTracer {
  project_name?: string;
  example_id?: string;
}

export interface RunKwargs {
  input?: unknown;
  command?: RunCommand;
  stream_mode?: Array<StreamMode>;
  interrupt_before?: '*' | string[] | undefined;
  interrupt_after?: '*' | string[] | undefined;
  config?: RunnableConfig;
  context?: unknown;
  subgraphs?: boolean;
  resumable?: boolean;
  temporary?: boolean;
  webhook?: unknown;
  feedback_keys?: string[] | undefined;
  [key: string]: unknown;
}

export interface Run {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  created_at: Date;
  updated_at: Date;
  status: RunStatus;
  metadata: Metadata;
  kwargs: RunKwargs;
  multitask_strategy: MultitaskStrategy;
}

export interface Assistant {
  name: string;
  description: string | null;
  assistant_id: string;
  graph_id: string;
  created_at: Date;
  updated_at: Date;
  version: number;
  config: RunnableConfig;
  context: unknown;
  metadata: Metadata;
}

export interface Thread {
  thread_id: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Metadata;
  config?: RunnableConfig;
  status: ThreadStatus;
  values?: Record<string, unknown>;
  interrupts?: Record<string, unknown>;
}

export interface Checkpoint {
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string | null;
  checkpoint_map: Record<string, unknown> | null;
}

export interface CheckpointTask {
  id: string;
  name: string;
  error?: string;
  interrupts: Record<string, unknown>;
  state?: RunnableConfig;
}

export interface ThreadTask {
  id: string;
  name: string;
  error: string | null;
  interrupts: Record<string, unknown>[];
  checkpoint: Checkpoint | null;
  state: ThreadState | null;
  result: unknown | null;
}

export interface ThreadState {
  values: Record<string, unknown>;
  next: string[];
  checkpoint: Checkpoint | null;
  metadata: Record<string, unknown> | undefined;
  created_at: Date | null;
  parent_checkpoint: Checkpoint | null;
  tasks: ThreadTask[];
}

// DTO 类型 - 用于 HTTP 请求/响应

export interface RunCreateDTO {
  assistant_id: string;
  checkpoint_id?: string;
  checkpoint?: CheckpointSchema;
  input?: unknown | null;
  command?: RunCommand;
  metadata?: Metadata;
  context?: unknown;
  config?: RunnableConfig;
  webhook?: string;
  interrupt_before?: '*' | string[];
  interrupt_after?: '*' | string[];
  on_disconnect?: OnDisconnect;
  multitask_strategy?: MultitaskStrategy;
  stream_mode?: StreamMode | StreamMode[];
  stream_subgraphs?: boolean;
  stream_resumable?: boolean;
  after_seconds?: number;
  if_not_exists?: IfNotExists;
  on_completion?: OnCompletion;
  feedback_keys?: string[];
  langsmith_tracer?: LangsmithTracer;
}

export interface RunSearchDTO {
  limit?: number;
  offset?: number;
  status?: string;
  metadata?: Metadata;
}

export interface CronCreateDTO {
  thread_id: string;
  assistant_id: string;
  checkpoint_id?: string;
  input?: unknown[] | Record<string, unknown>;
  metadata?: Metadata;
  config?: RunnableConfig;
  context?: unknown;
  webhook?: string;
  interrupt_before?: '*' | string[];
  interrupt_after?: '*' | string[];
  multitask_strategy?: MultitaskStrategy;
}

export interface CronSearchDTO {
  assistant_id?: string;
  thread_id?: string;
  limit?: number;
  offset?: number;
}

// Auth Context (需要适配 Tegg 的认证系统)
export interface AuthContext {
  user: {
    id: string;
    identity?: string;
    [key: string]: unknown;
  };
  scopes: string[];
}
