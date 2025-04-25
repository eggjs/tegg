import type { MiddlewareFunc } from '@eggjs/tegg-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';


export class MCPToolMeta {
  readonly name: string;
  readonly needAcl: boolean;
  readonly aclCode?: string;
  readonly mcpName?: string;
  readonly description?: string;
  readonly schema?: Parameters<McpServer['tool']>['2'];
  readonly middlewares: readonly MiddlewareFunc[];

  constructor(opt: {
    name: string;
    middlewares: MiddlewareFunc[];
    needAcl?: boolean;
    aclCode?: string,
    description?: string;
    mcpName?: string;
    schema?: Parameters<McpServer['tool']>['2'];
  }) {
    this.name = opt.name;
    this.needAcl = !!opt.needAcl;
    this.description = opt.description;
    this.mcpName = opt.mcpName;
    this.middlewares = opt.middlewares;
    this.aclCode = opt.aclCode;
    this.schema = opt.schema;
  }
}
