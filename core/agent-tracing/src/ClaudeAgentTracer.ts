import { randomUUID } from 'node:crypto';

import type { SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { SingletonProto, Inject } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';
import type { Logger } from '@eggjs/tegg-types';
import type { Run } from '@langchain/core/tracers/base';

import { Trace } from './Trace';
import type { TracingService } from './TracingService';
import {
  type ClaudeMessage,
  type ClaudeContentBlock,
  type ClaudeTokenUsage,
  type IRunCost,
  type CreateTraceOptions,
  RunStatus,
  type TracerConfig,
  applyTracerConfig,
} from './types';

/**
 * ClaudeAgentTracer - Converts Claude SDK messages to LangChain Run format
 * and logs them to the same remote logging system as LangGraphTracer.
 *
 * Supports both batch processing (processMessages) and streaming (createTrace).
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ClaudeAgentTracer {
  /** @internal */
  @Inject()
  readonly logger: Logger;

  @Inject()
  private tracingService: TracingService;

  name = 'ClaudeAgentTracer';
  agentName = '';

  /**
   * Configure the tracer with agent name and service credentials.
   */
  configure(config: TracerConfig): void {
    applyTracerConfig(this, config);
  }

  /**
   * Create a new trace for one agent execution.
   * Returns a Trace object for streaming message processing.
   *
   * @param options.traceId - Server-side trace ID for call chain linking. Defaults to a random UUID.
   * @param options.threadId - Thread ID (conversation/session identifier), recorded in metadata.
   * @param options.inputs - Additional inputs to merge into root run's inputs (e.g. user messages).
   *
   * @example
   * const trace = claudeTracer.createTrace({
   *   traceId: ctx.tracer.traceId,
   *   threadId,
   *   inputs: { messages: [{ role: 'user', content: 'hello' }] },
   * });
   * for await (const message of agent.run('task')) {
   *   await trace.processMessage(message);
   * }
   */
  public createTrace(options?: CreateTraceOptions): Trace {
    return new Trace(this, options);
  }

  /**
   * Main entry point - convert SDK messages to Run trees and log them.
   * Use this when you have all messages collected (batch processing).
   * For real-time streaming, use createTrace() instead.
   *
   * Non-tracing message types (tool_progress, stream_event, status, etc.) are automatically filtered out.
   */
  public async processMessages(sdkMessages: SDKMessage[]): Promise<void> {
    try {
      if (!sdkMessages || sdkMessages.length === 0) {
        this.logger.warn('[ClaudeAgentTracer] No messages to process');
        return;
      }

      // Pre-validate: ensure there is an init message before creating trace
      const hasInit = sdkMessages.some(m => m.type === 'system' && 'subtype' in m && m.subtype === 'init');
      if (!hasInit) {
        this.logger.warn('[ClaudeAgentTracer] No system/init message found');
        return;
      }

      // Delegate to Trace for message processing
      const trace = this.createTrace();
      for (const msg of sdkMessages) {
        await trace.processMessage(msg);
      }
    } catch (e) {
      this.logger.warn('[ClaudeAgentTracer] processMessages error:', e);
    }
  }

  /**
   * @internal
   * Convert an SDKMessage to internal ClaudeMessage format.
   * Returns null for message types that are not relevant to tracing.
   */
  convertSDKMessage(msg: SDKMessage): ClaudeMessage | null {
    // SDKSystemMessage (init)
    if (msg.type === 'system' && 'subtype' in msg && msg.subtype === 'init') {
      return msg as unknown as ClaudeMessage;
    }

    // SDKAssistantMessage
    if (msg.type === 'assistant' && 'message' in msg && 'parent_tool_use_id' in msg) {
      return {
        type: 'assistant',
        uuid: msg.uuid,
        session_id: msg.session_id,
        message: msg.message as any,
        parent_tool_use_id: msg.parent_tool_use_id,
      };
    }

    // SDKUserMessage (tool results, not replay)
    if (msg.type === 'user' && 'message' in msg && !('isReplay' in msg && (msg as any).isReplay)) {
      return {
        type: 'user',
        uuid: msg.uuid || randomUUID(),
        session_id: msg.session_id,
        message: msg.message as any,
        parent_tool_use_id: (msg as any).parent_tool_use_id,
      };
    }

    // SDKResultMessage (success or error)
    if (msg.type === 'result') {
      const resultMsg = msg as SDKResultMessage;
      const isSuccess = resultMsg.subtype === 'success';
      return {
        type: 'result',
        subtype: isSuccess ? 'success' : 'error',
        is_error: resultMsg.is_error,
        duration_ms: resultMsg.duration_ms,
        duration_api_ms: resultMsg.duration_api_ms,
        num_turns: resultMsg.num_turns,
        result: isSuccess ? (resultMsg as any).result : (resultMsg as any).errors?.join('; ') || 'Unknown error',
        session_id: resultMsg.session_id,
        total_cost_usd: resultMsg.total_cost_usd,
        usage: resultMsg.usage as any,
        modelUsage: resultMsg.modelUsage as any,
        uuid: resultMsg.uuid,
      };
    }

    // Ignore all other SDK message types (tool_progress, stream_event, status, hook, etc.)
    return null;
  }

  /**
   * @internal
   * Create root run from init message (used by Trace)
   */
  createRootRunInternal(initMsg: ClaudeMessage, startTime: number, traceId: string, rootRunId?: string, threadId?: string): Run {
    const runId = rootRunId || initMsg.uuid || randomUUID();
    const resolvedThreadId = threadId || initMsg.session_id;

    return {
      id: runId,
      name: this.name,
      run_type: 'chain',
      inputs: {},
      outputs: undefined,
      start_time: startTime,
      end_time: undefined,
      execution_order: 1,
      child_execution_order: 1,
      child_runs: [],
      events: [],
      trace_id: traceId,
      parent_run_id: undefined,
      tags: [],
      extra: {
        metadata: {
          thread_id: resolvedThreadId,
        },
        tools: initMsg.tools || [],
        model: initMsg.model,
        session_id: resolvedThreadId,
        mcp_servers: initMsg.mcp_servers,
        agents: initMsg.agents,
        slash_commands: initMsg.slash_commands,
        apiKeySource: initMsg.apiKeySource,
        claude_code_version: initMsg.claude_code_version,
        output_style: initMsg.output_style,
        permissionMode: initMsg.permissionMode,
      },
    } as Run;
  }

  /**
   * @internal
   * Create LLM run from assistant message (used by Trace)
   */
  createLLMRunInternal(
    msg: ClaudeMessage,
    rootRunId: string,
    traceId: string,
    order: number,
    startTime: number,
    isToolCall: boolean,
  ): Run {
    const runId = msg.uuid || randomUUID();
    const content = msg.message?.content || [];

    const textBlocks = content.filter(c => c.type === 'text');
    const toolBlocks = content.filter(c => c.type === 'tool_use');

    const inputs = {
      messages: textBlocks.map(c => (c as any).text).filter(Boolean),
    };

    const outputs: any = {};
    if (isToolCall) {
      outputs.tool_calls = toolBlocks.map(c => ({
        id: (c as any).id,
        name: (c as any).name,
        input: (c as any).input,
      }));
    } else {
      outputs.content = textBlocks.map(c => (c as any).text).join('');
    }

    if (msg.message?.usage) {
      outputs.llmOutput = this.extractTokenUsage(msg.message.usage);
    }

    return {
      id: runId,
      name: 'LLM',
      run_type: 'llm',
      inputs,
      outputs,
      start_time: startTime,
      end_time: startTime,
      execution_order: order,
      child_execution_order: order,
      child_runs: [],
      events: [],
      trace_id: traceId,
      parent_run_id: rootRunId,
      tags: [],
      extra: {
        model: msg.message?.model,
      },
    } as Run;
  }

  /**
   * @internal
   * Create tool run at start (before result, used by Trace)
   */
  createToolRunStartInternal(
    toolUseBlock: ClaudeContentBlock,
    rootRunId: string,
    traceId: string,
    order: number,
    startTime: number,
  ): Run {
    const toolUse = toolUseBlock as any;
    const runId = randomUUID();

    return {
      id: runId,
      name: toolUse.name || 'Tool',
      run_type: 'tool',
      inputs: {
        tool_use_id: toolUse.id,
        ...toolUse.input,
      },
      outputs: undefined,
      start_time: startTime,
      end_time: undefined,
      execution_order: order,
      child_execution_order: order,
      child_runs: [],
      events: [],
      trace_id: traceId,
      parent_run_id: rootRunId,
      tags: [],
      extra: {
        tool_use_id: toolUse.id,
      },
    } as Run;
  }

  /**
   * @internal
   * Complete tool run with result (used by Trace)
   */
  completeToolRunInternal(toolRun: Run, toolResultBlock: ClaudeContentBlock, startTime: number): void {
    const result = toolResultBlock as any;
    toolRun.end_time = startTime;
    toolRun.outputs = {
      content: result.content,
    };

    if (result.is_error) {
      toolRun.error = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    }
  }

  /**
   * Extract token usage from Claude SDK usage object into IRunCost format.
   */
  private extractTokenUsage(usage: ClaudeTokenUsage): IRunCost {
    const result: IRunCost = {};

    if (usage.input_tokens !== undefined) {
      result.promptTokens = usage.input_tokens;
    }
    if (usage.output_tokens !== undefined) {
      result.completionTokens = usage.output_tokens;
    }
    if (usage.cache_creation_input_tokens !== undefined) {
      result.cacheCreationInputTokens = usage.cache_creation_input_tokens;
    }
    if (usage.cache_read_input_tokens !== undefined) {
      result.cacheReadInputTokens = usage.cache_read_input_tokens;
    }

    const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    if (totalTokens > 0) {
      result.totalTokens = totalTokens;
    }

    return result;
  }

  /**
   * @internal
   * Create run cost from result message (used by Trace)
   */
  createRunCostInternal(resultMsg: ClaudeMessage): IRunCost {
    const cost: IRunCost = resultMsg.usage ? this.extractTokenUsage(resultMsg.usage) : {};

    if (resultMsg.total_cost_usd !== undefined) {
      cost.totalCost = resultMsg.total_cost_usd;
    }

    return cost;
  }

  /**
   * @internal
   * Log trace - delegates to TracingService (used by Trace)
   */
  logTrace(run: Run, status: RunStatus): void {
    this.tracingService.logTrace(run, status, this.name, this.agentName);
  }
}
