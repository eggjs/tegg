import { MiddlewareFunc } from '@eggjs/tegg';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ResourceMetadata } from '@modelcontextprotocol/sdk/server/mcp.js';

export class MCPResourceMeta {
  readonly name: string;
  readonly needAcl: boolean;
  readonly aclCode?: string;
  readonly mcpName?: string;
  readonly uri?: string;
  readonly template?: ResourceTemplate;
  readonly metadata?: ResourceMetadata;
  readonly middlewares: readonly MiddlewareFunc[];

  constructor(opt: {
    name: string;
    middlewares: MiddlewareFunc[];
    needAcl?: boolean;
    aclCode?: string,
    mcpName?: string;
    uri?: string;
    template?: ConstructorParameters<typeof ResourceTemplate>;
    metadata?: ResourceMetadata;
  }) {
    this.name = opt.name;
    this.needAcl = !!opt.needAcl;
    this.uri = opt.uri;
    this.metadata = opt.metadata;
    if (opt.template) {
      this.template = new ResourceTemplate(opt.template[0], opt.template[1]);
    }
    this.middlewares = opt.middlewares;
    this.aclCode = opt.aclCode;
    this.mcpName = opt.mcpName;
  }
}
