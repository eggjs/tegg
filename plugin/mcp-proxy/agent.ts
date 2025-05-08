import { Application } from 'egg';

export default class AppHook {
  private readonly agent: Application;

  constructor(agent: Application) {
    this.agent = agent;
  }

  async didLoad() {
    if (this.agent.mcpProxy) {
      await (this.agent.mcpProxy as any)?.ready();
    }
  }
}
