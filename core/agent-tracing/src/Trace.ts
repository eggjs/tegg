import { randomUUID } from 'node:crypto';

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { Run } from '@langchain/core/tracers/base';

import type { ClaudeAgentTracer } from './ClaudeAgentTracer';
import {
  type ClaudeMessage,
  type CreateTraceOptions,
  RunStatus,
} from './types';

/**
 * Trace - Manages state for a single agent execution with streaming support.
 * Allows processing messages one-by-one and logging them immediately.
 */
export class Trace {
  private traceId: string;
  private threadId?: string;
  private inputs?: Record<string, any>;
  private rootRun: Run | null = null;
  private rootRunId: string;
  private startTime: number;
  private executionOrder = 2; // Start at 2, root is 1
  private pendingToolUses = new Map<string, Run>();
  private tracer: ClaudeAgentTracer;

  constructor(tracer: ClaudeAgentTracer, options?: CreateTraceOptions) {
    this.tracer = tracer;
    this.traceId = options?.traceId || randomUUID();
    this.threadId = options?.threadId;
    this.inputs = options?.inputs;
    this.rootRunId = randomUUID();
    this.startTime = Date.now();
  }

  /**
   * Process a single SDK message and log it immediately.
   * Non-tracing message types (tool_progress, stream_event, status, etc.) are automatically ignored.
   */
  async processMessage(message: SDKMessage): Promise<void> {
    try {
      const converted = this.tracer.convertSDKMessage(message);
      if (!converted) return;

      if (converted.type === 'system' && converted.subtype === 'init') {
        this.handleInit(converted);
      } else if (converted.type === 'assistant') {
        this.handleAssistant(converted);
      } else if (converted.type === 'user') {
        this.handleUser(converted);
      } else if (converted.type === 'result') {
        this.handleResult(converted);
      }
    } catch (e) {
      this.tracer.logger.warn('[ClaudeAgentTracer] processMessage error:', e);
    }
  }

  private handleInit(message: ClaudeMessage): void {
    // threadId: prefer constructor option, fallback to init message's session_id
    if (!this.threadId) {
      this.threadId = message.session_id;
    }
    this.rootRun = this.tracer.createRootRunInternal(message, this.startTime, this.traceId, this.rootRunId, this.threadId);
    if (this.inputs) {
      Object.assign(this.rootRun.inputs, this.inputs);
    }
    this.tracer.logTrace(this.rootRun, RunStatus.START);
  }

  private handleAssistant(message: ClaudeMessage): void {
    if (!this.rootRun) {
      this.tracer.logger.warn('[ClaudeAgentTracer] Received assistant message before init');
      return;
    }

    const content = message.message?.content || [];
    const hasToolUse = content.some(c => c.type === 'tool_use');
    const hasText = content.some(c => c.type === 'text');

    if (hasToolUse) {
      const eventTime = Date.now();
      // Create LLM run that initiated tool calls
      const llmRun = this.tracer.createLLMRunInternal(
        message,
        this.rootRunId,
        this.traceId,
        this.executionOrder++,
        eventTime,
        true,
      );
      this.rootRun.child_runs.push(llmRun);
      this.tracer.logTrace(llmRun, RunStatus.END);

      // Create tool runs (will be completed when tool_result arrives)
      for (const block of content) {
        if (block.type === 'tool_use') {
          const toolRun = this.tracer.createToolRunStartInternal(
            block,
            this.rootRunId,
            this.traceId,
            this.executionOrder++,
            eventTime,
          );
          this.rootRun.child_runs.push(toolRun);
          this.pendingToolUses.set(block.id, toolRun);
          this.tracer.logTrace(toolRun, RunStatus.START);
        }
      }
    } else if (hasText) {
      // Text-only response
      const llmRun = this.tracer.createLLMRunInternal(
        message,
        this.rootRunId,
        this.traceId,
        this.executionOrder++,
        Date.now(),
        false,
      );
      this.rootRun.child_runs.push(llmRun);
      this.tracer.logTrace(llmRun, RunStatus.END);
    }
  }

  private handleUser(message: ClaudeMessage): void {
    if (!message.message?.content) return;

    for (const block of message.message.content) {
      if (block.type === 'tool_result') {
        const toolRun = this.pendingToolUses.get(block.tool_use_id);
        if (toolRun) {
          this.tracer.completeToolRunInternal(toolRun, block, Date.now());
          const status = block.is_error ? RunStatus.ERROR : RunStatus.END;
          this.tracer.logTrace(toolRun, status);
          this.pendingToolUses.delete(block.tool_use_id);
        }
      }
    }
  }

  private handleResult(message: ClaudeMessage): void {
    if (!this.rootRun) {
      this.tracer.logger.warn('[ClaudeAgentTracer] Received result message before init');
      return;
    }

    // Complete any pending tool runs
    for (const [ toolUseId, toolRun ] of this.pendingToolUses) {
      this.tracer.logger.warn(`[ClaudeAgentTracer] Tool run ${toolUseId} did not receive result`);
      toolRun.end_time = Date.now();
      this.tracer.logTrace(toolRun, RunStatus.ERROR);
    }
    this.pendingToolUses.clear();

    // Update and log root run end
    this.rootRun.end_time = this.startTime + (message.duration_ms || 0);
    this.rootRun.outputs = {
      result: message.result,
      is_error: message.is_error,
      num_turns: message.num_turns,
    };

    if (message.usage || message.modelUsage) {
      const cost = this.tracer.createRunCostInternal(message);
      if (this.rootRun.outputs) {
        (this.rootRun.outputs as any).llmOutput = cost;
      }
    }

    if (message.is_error) {
      this.rootRun.error = message.result;
    }

    this.rootRun.child_execution_order = this.executionOrder - 1;
    const status = message.is_error ? RunStatus.ERROR : RunStatus.END;
    this.tracer.logTrace(this.rootRun, status);
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string {
    return this.traceId;
  }
}
