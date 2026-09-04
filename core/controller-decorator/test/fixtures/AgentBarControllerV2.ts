import type { CreateRunInput, RuntimeMessage } from '@eggjs/tegg-types/agent-runtime';
import { RUNTIME_MESSAGE_PROTOCOL } from '@eggjs/tegg-types/agent-runtime';

import { AgentControllerV2 } from '../../src/decorator/agent/AgentController';
import type { AgentHandlerV2 } from '../../src/decorator/agent/AgentHandlerV2';

// The V2 counterpart of AgentFooController: same smart-defaults pattern, but the
// executor yields self-describing envelopes instead of Claude-shaped messages.
@AgentControllerV2()
export class AgentBarControllerV2 implements AgentHandlerV2 {
  async createStore(): Promise<unknown> {
    return new Map();
  }

  async *execRun(input: CreateRunInput): AsyncGenerator<RuntimeMessage> {
    yield {
      protocol: RUNTIME_MESSAGE_PROTOCOL,
      eventType: 'message',
      persistence: 'durable',
      sessionCommitted: true,
      payload: {
        role: 'assistant',
        parts: [{ type: 'text', text: `Processed ${input.input.messages.length} messages` }],
      },
    };
  }
}
