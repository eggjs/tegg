import 'egg';
import type { ClaudeSessionStore } from '../lib/ClaudeSessionStore';
import type { ClaudeSessionFactory } from '../lib/ClaudeSessionFactory';
import type { ClaudeSession } from '../lib/types';

declare module 'egg' {
  interface Application {
    claudeSessionStore: ClaudeSessionStore;
    claudeSessionFactory: ClaudeSessionFactory;
  }

  interface Context {
    claude?: {
      session?: ClaudeSession;
    };
  }

  interface EggAppConfig {
    // reserved
  }
}
