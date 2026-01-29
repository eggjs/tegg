import type { ClaudeSession, CreateSessionOptions } from './types';
import type { ClaudeSessionFactory } from './ClaudeSessionFactory';

export class ClaudeSessionStore {
  readonly #factory: ClaudeSessionFactory;
  readonly #sessions = new Map<string, ClaudeSession>();

  constructor(factory: ClaudeSessionFactory) {
    this.#factory = factory;
  }

  async create(options: CreateSessionOptions = {}): Promise<ClaudeSession> {
    const session = await this.#factory.create(options);
    this.#sessions.set(session.sessionId, session);
    return session;
  }

  async getOrResume(sessionId: string, options: CreateSessionOptions = {}): Promise<ClaudeSession> {
    const existing = this.#sessions.get(sessionId);
    if (existing) return existing;
    const session = await this.#factory.create({ ...options, sessionId });
    this.#sessions.set(session.sessionId, session);
    return session;
  }

  async destroy(): Promise<void> {
    for (const s of this.#sessions.values()) {
      try { s.close(); } catch (_) { /* ignore */ }
    }
    this.#sessions.clear();
  }
}
