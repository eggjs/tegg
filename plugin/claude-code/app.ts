import type { Application, IBoot } from 'egg';
import claudeSessionMiddleware from './app/middleware/claude_session';
import { ClaudeSessionStore } from './lib/ClaudeSessionStore';
import { ClaudeSessionFactory } from './lib/ClaudeSessionFactory';

export default class ClaudeCodePlugin implements IBoot {
  readonly #app: Application;

  constructor(app: Application) {
    this.#app = app;

    // runtime singletons
    this.#app.claudeSessionFactory = new ClaudeSessionFactory(this.#app);
    this.#app.claudeSessionStore = new ClaudeSessionStore(this.#app.claudeSessionFactory);
  }

  configWillLoad() {
    // register middleware (users can also add manually)
    if (!this.#app.config.coreMiddleware.includes('claudeSessionMiddleware')) {
      this.#app.config.coreMiddleware.push('claudeSessionMiddleware');
    }

    // expose middleware implementation
    this.#app.middleware.claudeSessionMiddleware = claudeSessionMiddleware;
  }

  async beforeClose() {
    await this.#app.claudeSessionStore?.destroy();
  }
}
