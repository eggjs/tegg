import type { CreateRunInput, AgentMessage } from '@eggjs/tegg-types/agent-runtime';

import { AgentController } from '../../src/decorator/agent/AgentController';
import type { AgentHandler } from '../../src/decorator/agent/AgentHandler';

// AgentController that only implements execRun (smart defaults pattern)
@AgentController()
export class AgentFooController implements AgentHandler {
  async createStore(): Promise<unknown> {
    return new Map();
  }

  async *execRun(input: CreateRunInput): AsyncGenerator<AgentMessage> {
    const messages = input.input.messages;
    yield {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: `Processed ${messages.length} messages` }],
      },
    };
  }
}
