import type { Application } from 'egg';
import { randomUUID } from 'crypto';
import type { ClaudeSession, CreateSessionOptions, SDKMessage } from './types';

class InMemoryClaudeSession implements ClaudeSession {
  readonly sessionId: string;
  #closed = false;
  #queue: SDKMessage[] = [];

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? `sess_${randomUUID().replace(/-/g, '')}`;
  }

  async send(message: string | { type: 'user'; message: any }): Promise<void> {
    if (this.#closed) throw new Error('session closed');
    const payload = typeof message === 'string' ? { text: message } : message.message;
    this.#queue.push({ type: 'user', message: payload });

    // WIP behavior: echo back
    this.#queue.push({ type: 'assistant', message: { content: [ { text: '[WIP] session received message' } ] } });
    this.#queue.push({ type: 'result', subtype: 'success', result: 'wip' });
  }

  async *stream(): AsyncGenerator<SDKMessage, void> {
    while (!this.#closed && this.#queue.length > 0) {
      yield this.#queue.shift()!;
    }
  }

  close(): void {
    this.#closed = true;
    this.#queue = [];
  }
}

export class ClaudeSessionFactory {
  constructor(readonly app: Application) {}

  async create(options: CreateSessionOptions & { sessionId?: string } = {}): Promise<ClaudeSession> {
    // MVP: in-memory fake session. Later: wrap @anthropic-ai/claude-agent-sdk unstable_v2_createSession
    return new InMemoryClaudeSession(options.sessionId);
  }
}
