/**
 * LangGraph API Schemas
 * 从 langgraphjs/libs/langgraph-api/src/schemas.mts 迁移
 *
 * 注意：此文件需要 zod 依赖
 * 安装: npm install zod
 */

import { z } from 'zod';

// 基础工具 schema
export const coercedBoolean = z.string().transform((val) => {
  const lower = val.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes';
});

// Config schemas
export const AssistantConfigurable = z
  .object({
    thread_id: z.string().optional(),
    thread_ts: z.string().optional(),
  })
  .catchall(z.unknown());

export const AssistantConfig = z
  .object({
    tags: z.array(z.string()).optional(),
    recursion_limit: z.number().int().optional(),
    configurable: AssistantConfigurable.optional(),
  })
  .catchall(z.unknown())
  .describe('The configuration of an assistant.');

export const Config = z.object({
  tags: z.array(z.string()).optional(),
  recursion_limit: z.number().int().optional(),
  configurable: z.object({}).catchall(z.any()).optional(),
});

// Checkpoint schema
export const CheckpointSchema = z.object({
  checkpoint_id: z.string().uuid().optional(),
  checkpoint_ns: z.string().nullish(),
  checkpoint_map: z.record(z.unknown()).nullish(),
});

// Command schema
export const CommandSchema = z.object({
  goto: z
    .union([
      z.union([
        z.string(),
        z.object({ node: z.string(), input: z.unknown().optional() }),
      ]),
      z.array(
        z.union([
          z.string(),
          z.object({ node: z.string(), input: z.unknown().optional() }),
        ])
      ),
    ])
    .optional(),
  update: z
    .union([z.record(z.unknown()), z.array(z.tuple([z.string(), z.unknown()]))])
    .optional(),
  resume: z.unknown().optional(),
});

// Langsmith tracer schema
export const LangsmithTracer = z.object({
  project_name: z.string().optional(),
  example_id: z.string().optional(),
});

// Run schemas
export const Run = z.object({
  run_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  assistant_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  status: z.enum([
    'pending',
    'running',
    'error',
    'success',
    'timeout',
    'interrupted',
  ]),
  metadata: z.object({}).catchall(z.any()),
  kwargs: z.object({}).catchall(z.any()),
  multitask_strategy: z.enum(['reject', 'rollback', 'interrupt', 'enqueue']),
});

export const RunCreate = z
  .object({
    assistant_id: z.union([z.string().uuid(), z.string()]),
    checkpoint_id: z.string().optional(),
    checkpoint: CheckpointSchema.optional(),
    input: z.union([z.unknown(), z.null()]).optional(),
    command: CommandSchema.optional(),
    metadata: z
      .object({})
      .catchall(z.any())
      .describe('Metadata for the run.')
      .optional(),
    context: z.unknown().optional(),
    config: AssistantConfig.optional(),
    webhook: z.string().optional(),
    interrupt_before: z.union([z.enum(['*']), z.array(z.string())]).optional(),
    interrupt_after: z.union([z.enum(['*']), z.array(z.string())]).optional(),
    on_disconnect: z
      .enum(['cancel', 'continue'])
      .optional()
      .default('continue'),
    multitask_strategy: z
      .enum(['reject', 'rollback', 'interrupt', 'enqueue'])
      .optional(),
    stream_mode: z
      .union([
        z.array(
          z.enum([
            'values',
            'messages',
            'messages-tuple',
            'updates',
            'events',
            'tasks',
            'checkpoints',
            'debug',
            'custom',
          ])
        ),
        z.enum([
          'values',
          'messages',
          'messages-tuple',
          'updates',
          'events',
          'tasks',
          'checkpoints',
          'debug',
          'custom',
        ]),
      ])
      .optional(),
    stream_subgraphs: z.boolean().optional(),
    stream_resumable: z.boolean().optional(),
    after_seconds: z.number().optional(),
    if_not_exists: z.enum(['reject', 'create']).optional(),
    on_completion: z.enum(['delete', 'keep']).optional(),
    feedback_keys: z.array(z.string()).optional(),
    langsmith_tracer: LangsmithTracer.optional(),
  })
  .describe('Payload for creating a stateful run.');

export const RunBatchCreate = z
  .array(RunCreate)
  .min(1)
  .describe('Payload for creating a batch of runs.');

export const SearchResult = z
  .object({
    metadata: z
      .object({})
      .catchall(z.any())
      .describe('Metadata to search for.')
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe('Maximum number to return.')
      .optional(),
    offset: z
      .number()
      .int()
      .gte(0)
      .describe('Offset to start from.')
      .optional(),
  })
  .describe('Payload for listing runs.');

// Cron schemas
export const Cron = z.object({
  cron_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  end_time: z.string(),
  schedule: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  payload: z.object({}).catchall(z.any()),
});

export const CronCreate = z
  .object({
    thread_id: z.string().uuid(),
    assistant_id: z.string().uuid(),
    checkpoint_id: z.string().optional(),
    input: z
      .union([
        z.array(z.object({}).catchall(z.any())),
        z.object({}).catchall(z.any()),
      ])
      .optional(),
    metadata: z
      .object({})
      .catchall(z.any())
      .describe('Metadata for the run.')
      .optional(),
    config: AssistantConfig.optional(),
    context: z.unknown().optional(),
    webhook: z.string().optional(),
    interrupt_before: z.union([z.enum(['*']), z.array(z.string())]).optional(),
    interrupt_after: z.union([z.enum(['*']), z.array(z.string())]).optional(),
    multitask_strategy: z
      .enum(['reject', 'rollback', 'interrupt', 'enqueue'])
      .optional(),
  })
  .describe('Payload for creating a cron.');

export const CronSearch = z
  .object({
    assistant_id: z.string().uuid().optional(),
    thread_id: z.string().uuid().optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe('Maximum number to return.')
      .optional(),
    offset: z
      .number()
      .int()
      .gte(0)
      .describe('Offset to start from.')
      .optional(),
  })
  .describe('Payload for listing crons');

// Thread schemas
export const Thread = z.object({
  thread_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['idle', 'busy', 'interrupted', 'error']).optional(),
});

export const ThreadCreate = z
  .object({
    supersteps: z
      .array(
        z.object({
          updates: z.array(
            z.object({
              values: z.unknown().nullish(),
              command: CommandSchema.nullish(),
              as_node: z.string(),
            })
          ),
        })
      )
      .describe('The supersteps to apply to the thread.')
      .optional(),
    thread_id: z
      .string()
      .uuid()
      .describe('The ID of the thread. If not provided, an ID is generated.')
      .optional(),
    metadata: z
      .object({})
      .catchall(z.any())
      .describe('Metadata for the thread.')
      .optional(),
    if_exists: z
      .union([z.literal('raise'), z.literal('do_nothing')])
      .optional(),
  })
  .describe('Payload for creating a thread.');

export const ThreadPatch = z
  .object({
    metadata: z
      .object({})
      .catchall(z.any())
      .describe('Metadata to merge with existing thread metadata.')
      .optional(),
  })
  .describe('Payload for patching a thread.');

// Assistant schemas
export const Assistant = z.object({
  assistant_id: z.string().uuid(),
  graph_id: z.string(),
  config: AssistantConfig,
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.object({}).catchall(z.any()),
});

export const AssistantCreate = z
  .object({
    assistant_id: z
      .string()
      .uuid()
      .describe('The ID of the assistant. If not provided, an ID is generated.')
      .optional(),
    graph_id: z.string().describe('The graph to use.'),
    config: AssistantConfig.optional(),
    context: z.unknown().optional(),
    metadata: z
      .object({})
      .catchall(z.unknown())
      .describe('Metadata for the assistant.')
      .optional(),
    if_exists: z
      .union([z.literal('raise'), z.literal('do_nothing')])
      .optional(),
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .describe('Payload for creating an assistant.');

export const AssistantPatch = z
  .object({
    graph_id: z.string().describe('The graph to use.').optional(),
    config: AssistantConfig.optional(),
    context: z.unknown().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    metadata: z
      .object({})
      .catchall(z.any())
      .describe('Metadata to merge with existing assistant metadata.')
      .optional(),
  })
  .describe('Payload for updating an assistant.');
