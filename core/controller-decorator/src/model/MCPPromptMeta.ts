import type { MiddlewareFunc } from '@eggjs/tegg-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class MCPPromptMeta {
  readonly name: string;
  readonly needAcl: boolean;
  readonly mcpName?: string;
  readonly aclCode?: string;
  readonly description?: string;
  readonly schema?: Parameters<McpServer['prompt']>['2'];
  readonly middlewares: readonly MiddlewareFunc[];

  constructor(opt: {
    name: string;
    middlewares: MiddlewareFunc[];
    needAcl?: boolean;
    aclCode?: string,
    description?: string;
    mcpName?: string;
    schema?: Parameters<McpServer['prompt']>['2'];
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
