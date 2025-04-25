import { Application } from 'egg';

export default class AppHook {
  private readonly agent: Application;

  constructor(agent: Application) {
    this.agent = agent;
  }

  async didLoad() {
    await (this.agent.mcpProxy as any).ready();
  }
}
