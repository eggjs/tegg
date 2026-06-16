import type {
  AgentMessage,
  InputMessage,
  SDKResultMessage,
} from '@eggjs/tegg-types/agent-runtime';

import type { RunUsage } from './RunBuilder';

export class MessageConverter {
  /**
   * Extract accumulated usage from AgentMessage objects.
   * Only `result` type messages carry usage information.
   */
  static extractUsage(messages: AgentMessage[]): RunUsage | undefined {
    let promptTokens = 0;
    let completionTokens = 0;
    let hasUsage = false;

    for (const msg of messages) {
      if (msg.type === 'result') {
        const resultMsg = msg as SDKResultMessage;
        if (resultMsg.usage) {
          hasUsage = true;
          promptTokens += resultMsg.usage.input_tokens ?? 0;
          completionTokens += resultMsg.usage.output_tokens ?? 0;
        }
      }
    }

    if (!hasUsage) return undefined;
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  /**
   * Sum `duration_api_ms` across `result` messages — the run's pure model-API
   * time in ms. Returns undefined when no result message carried it.
   */
  static extractApiDurationMs(messages: AgentMessage[]): number | undefined {
    let total = 0;
    let has = false;
    for (const msg of messages) {
      if (msg.type === 'result') {
        const d = (msg as SDKResultMessage & { duration_api_ms?: number }).duration_api_ms;
        if (typeof d === 'number') {
          has = true;
          total += d;
        }
      }
    }
    return has ? total : undefined;
  }

  /**
   * Filter out stream_event messages before persisting to thread storage.
   * Stream events are incremental deltas (one per token) only useful during
   * real-time streaming; the final assistant message already contains the
   * complete response.
   */
  static filterForStorage(messages: AgentMessage[]): AgentMessage[] {
    return messages.filter(m => m.type !== 'stream_event');
  }

  /**
   * Convert input messages to AgentMessage format for thread history.
   * System messages are filtered out — they are transient instructions,
   * not conversation history.
   */
  static toAgentMessages(messages: InputMessage[]): AgentMessage[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        type: m.role as 'user' | 'assistant',
        message: { role: m.role, content: m.content },
      }));
  }
}
