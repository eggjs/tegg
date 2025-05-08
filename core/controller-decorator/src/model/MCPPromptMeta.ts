import type { MiddlewareFunc } from '@eggjs/tegg-types';
import { PromptArgsSchemaDetail } from '../../src/util/MCPInfoUtil';

export class MCPPromptMeta {
  readonly name: string;
  readonly needAcl: boolean;
  readonly mcpName?: string;
  readonly aclCode?: string;
  readonly description?: string;
  readonly detail?: PromptArgsSchemaDetail;
  readonly middlewares: readonly MiddlewareFunc[];
  readonly extra?: number;

  constructor(opt: {
    name: string;
    middlewares: MiddlewareFunc[];
    needAcl?: boolean;
    aclCode?: string,
    description?: string;
    mcpName?: string;
    detail?: PromptArgsSchemaDetail;
    extra?: number;
  }) {
    this.name = opt.name;
    this.needAcl = !!opt.needAcl;
    this.description = opt.description;
    this.mcpName = opt.mcpName;
    this.middlewares = opt.middlewares;
    this.aclCode = opt.aclCode;
    this.detail = opt.detail;
    this.extra = opt.extra;
  }
}
