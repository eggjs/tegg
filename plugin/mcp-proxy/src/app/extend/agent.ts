import { MCPProxyApiClient } from '../../index.ts';
import { Application } from 'egg';

const MCP_PROXY = Symbol('Application#mcpProxy');

export default {
  get mcpProxy() {
    if (!this[MCP_PROXY]) {
      this[MCP_PROXY] = new MCPProxyApiClient({
        logger: (this as unknown as Application).logger,
        messenger: (this as unknown as Application).messenger,
        app: this as unknown as Application,
        isAgent: true,
      });
    }
    return this[MCP_PROXY];
  },
};
