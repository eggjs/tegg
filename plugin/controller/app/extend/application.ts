import type { Application } from 'egg';
import type MCPRequestUnitTest from '../../lib/impl/mcp/MCPRequestUnitTest';
import type { MCPRequestMockApplication } from '../../lib/impl/mcp/MCPRequestUnitTest';

export default {
  mcpRequest(this: Application, name?: string): MCPRequestUnitTest {
    const majorVersion = parseInt(process.versions.node.split('.')[0], 10);
    if (majorVersion < 18) {
      throw new Error('app.mcpRequest() requires Node.js >= 18.');
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RequestUnitTest = require('../../lib/impl/mcp/MCPRequestUnitTest').default as typeof import('../../lib/impl/mcp/MCPRequestUnitTest').default;
    return new RequestUnitTest({
      app: this as MCPRequestMockApplication,
      serverName: name,
    });
  },
};
