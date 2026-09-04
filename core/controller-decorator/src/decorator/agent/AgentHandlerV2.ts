import type {
  ThreadObject,
  ThreadObjectWithMessages,
  CreateRunInput,
  RunObject,
  RuntimeMessage,
} from '@eggjs/tegg-types/agent-runtime';

/**
 * Contract for classes decorated with `@AgentControllerV2`.
 *
 * Same HTTP surface as V1 (mounted at `/api/v2`), same auto-wired thread/run
 * management, SSE streaming and cancellation. The difference is `execRun`: it
 * yields self-describing {@link RuntimeMessage} envelopes, so the framework never
 * interprets a particular agent SDK's wire format.
 *
 * A V2 executor states up front what V1 forced the runtime to infer:
 *
 * | question                      | V1                            | V2                 |
 * | ----------------------------- | ----------------------------- | ------------------ |
 * | persist this message?         | `type !== 'stream_event'`     | `persistence`      |
 * | SSE event name?               | `msg.type`                    | `eventType`        |
 * | part of the conversation?     | `type` is user/assistant      | `conversational`   |
 * | provider session recoverable? | `isSessionCommitted` callback | `sessionCommitted` |
 * | token usage?                  | Claude-shaped `result.usage`  | `usage`            |
 *
 * V1 and V2 controllers coexist in one application as separate classes; give each
 * its own store prefix so their threads stay isolated.
 */
export interface AgentHandlerV2 {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<RuntimeMessage>;
  /** Create the AgentStore used to persist threads and runs. */
  createStore(): Promise<unknown>;
  createThread?(): Promise<ThreadObject>;
  getThread?(threadId: string): Promise<ThreadObjectWithMessages>;
  getLatestRunId?(threadId: string): Promise<{ threadId: string; runId: string | null }>;
  asyncRun?(input: CreateRunInput): Promise<RunObject>;
  streamRun?(input: CreateRunInput): Promise<void>;
  syncRun?(input: CreateRunInput): Promise<RunObject>;
  getRun?(runId: string): Promise<RunObject>;
  cancelRun?(runId: string): Promise<RunObject>;
}
