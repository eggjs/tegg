import type {
  AgentMessage,
  InputMessage,
  SDKResultMessage,
} from '@eggjs/tegg-types/agent-runtime';
import { RUNTIME_MESSAGE_PROTOCOL } from '@eggjs/tegg-types/agent-runtime';

import type { RunUsage } from './RunBuilder';

/**
 * Whether a stored record belongs to the user-visible conversation — the set
 * `getThread` returns without `includeAllMessages`, and the set `hasMessages`
 * asks about.
 *
 * Exported for `AgentStore` implementors: call this rather than testing `type`
 * directly. Under V1 the two agree (a conversation message is a `user` or
 * `assistant` one), but a V2 record's payload is opaque and declares its own
 * status, so a hard-coded `type` check would report an established V2 thread as
 * empty and make the runtime restart it instead of resuming.
 *
 * The declaration counts only when the record also carries the V2 protocol
 * stamp. A bare boolean is not enough: a V1 executor may already have been using
 * `conversational` as its own `eggExt` field, and honouring that would change
 * how its existing history reads after the upgrade.
 */
export function isConversationMessage(message: AgentMessage): boolean {
  const ext = message.eggExt;
  if (ext?.runtimeProtocol === RUNTIME_MESSAGE_PROTOCOL && typeof ext.conversational === 'boolean') {
    return ext.conversational;
  }
  return message.type === 'user' || message.type === 'assistant';
}

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
   * Filter transient progress messages before persisting to thread storage.
   * Stream events are incremental content deltas, while thinking_tokens only
   * reports estimated token-count progress. The final assistant messages
   * already contain the complete response and thinking content.
   */
  /**
   * V1's rule for messages that are streamed but never persisted.
   *
   * Extracted so {@link filterForStorage} and the runtime's V1 normalization
   * path share a single definition and cannot drift apart.
   */
  static isTransientMessage(msg: AgentMessage): boolean {
    return msg.type === 'stream_event' ||
      (msg.type === 'system' && msg.subtype === 'thinking_tokens');
  }

  static filterForStorage(messages: AgentMessage[]): AgentMessage[] {
    return messages.filter(m => !MessageConverter.isTransientMessage(m));
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
