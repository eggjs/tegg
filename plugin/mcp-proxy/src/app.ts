import { Application } from 'egg';
import { MCPProxyHook } from './index.ts';
import { MCPControllerRegister } from '@eggjs/tegg-controller-plugin/lib/impl/mcp/MCPControllerRegister';

export default class AppHook {
  private readonly agent: Application;

  constructor(agent: Application) {
    this.agent = agent;
  }

  configWillLoad() {
    MCPControllerRegister.addHook(MCPProxyHook);
  }

  async didLoad() {
    if (this.agent.mcpProxy) {
      await (this.agent.mcpProxy as any)?.ready();
    }
  }
}
