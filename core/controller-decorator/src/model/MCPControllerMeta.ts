import { ControllerType } from '@eggjs/tegg-types';
import type { ControllerMetadata, MiddlewareFunc, EggPrototypeName } from '@eggjs/tegg-types';
import { MCPToolMeta } from './MCPToolMeta';
import { MCPResourceMeta } from './MCPResourceMeta';
import { MCPPromptMeta } from './MCPPromptMeta';

export class MCPControllerMeta implements ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  readonly methods: never[];
  readonly middlewares: readonly MiddlewareFunc[];
  readonly type = ControllerType.MCP;
  readonly name: string;
  readonly version: string;
  readonly needAcl: boolean;
  readonly aclCode?: string;
  readonly tools: MCPToolMeta[];
  readonly resources: MCPResourceMeta[];
  readonly prompts: MCPPromptMeta[];

  get id() {
    return `${this.name}:${1.0}`;
  }

  constructor(
    className: string,
    protoName: EggPrototypeName,
    controllerName: string,
    name: string,
    version: string,
    tools: MCPToolMeta[],
    resources: MCPResourceMeta[],
    prompts: MCPPromptMeta[],
    middlewares: MiddlewareFunc[],
    needAcl?: boolean,
    aclCode?: string,
  ) {
    this.protoName = protoName;
    this.controllerName = controllerName;
    this.className = className;
    this.name = name;
    this.version = version;
    this.tools = tools;
    this.resources = resources;
    this.prompts = prompts;
    this.middlewares = middlewares;
    this.methods = [];
    this.needAcl = !!needAcl;
    this.aclCode = aclCode;
  }

  getMethodMiddlewares(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta) {
    if (this.middlewares.length) {
      return [
        ...this.middlewares,
        ...method.middlewares,
      ];
    }
    return method.middlewares;
  }

  hasMethodAcl(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): boolean {
    return method.needAcl || this.needAcl;
  }

  getMethodAcl(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): string | undefined {
    return method.aclCode || this.aclCode;
  }
}
