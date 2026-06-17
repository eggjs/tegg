import {
  McpServer,
  ReadResourceCallback,
  ToolCallback,
  PromptCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { CONTROLLER_META_DATA } from '@eggjs/tegg';
import type { EggObject, EggObjectName, EggPrototype } from '@eggjs/tegg-types';
import { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/tegg';

export interface MCPServerHelperOptions {
  name: string;
  version: string;
  getContext?: () => unknown;
}

export class MCPServerHelper {
  server: McpServer;
  private readonly getContext?: () => unknown;

  constructor(opts: MCPServerHelperOptions) {
    this.server = new McpServer(
      {
        name: opts.name,
        version: opts.version,
      },
      { capabilities: { logging: {} } },
    );
    this.getContext = opts.getContext;
  }

  private buildResourceArgs(args: any[], resourceMeta: MCPResourceMeta) {
    const newArgs = [ ...args ];
    if (resourceMeta.extra !== undefined) {
      newArgs[resourceMeta.extra] = resourceMeta.template ? args[2] : args[1];
    }
    if (resourceMeta.contextParamIndex !== undefined) {
      newArgs[resourceMeta.contextParamIndex] = this.getContext?.();
    }
    return newArgs;
  }

  private buildToolArgs(args: any[], toolMeta: MCPToolMeta, hasSchema: boolean) {
    const newArgs = [ ...args ];
    if (hasSchema && toolMeta.detail) {
      newArgs[toolMeta.detail.index] = args[0];
    }
    if (toolMeta.extra !== undefined) {
      newArgs[toolMeta.extra] = hasSchema ? args[1] : args[0];
    }
    if (toolMeta.contextParamIndex !== undefined) {
      newArgs[toolMeta.contextParamIndex] = this.getContext?.();
    }
    return newArgs;
  }

  private buildPromptArgs(args: any[], promptMeta: MCPPromptMeta, hasSchema: boolean) {
    const newArgs = [ ...args ];
    if (hasSchema && promptMeta.detail) {
      newArgs[promptMeta.detail.index] = args[0];
    }
    if (promptMeta.extra !== undefined) {
      newArgs[promptMeta.extra] = hasSchema ? args[1] : args[0];
    }
    if (promptMeta.contextParamIndex !== undefined) {
      newArgs[promptMeta.contextParamIndex] = this.getContext?.();
    }
    return newArgs;
  }

  async mcpResourceRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    resourceMeta: MCPResourceMeta,
  ) {
    const handler = async (...args) => {
      const eggObj = await getOrCreateEggObject(
        controllerProto,
        controllerProto.name,
      );
      const realObj = eggObj.obj;
      const realMethod = realObj[resourceMeta.name];
      const newArgs = this.buildResourceArgs(args, resourceMeta);
      return Reflect.apply(
        realMethod,
        realObj,
        newArgs,
      ) as ReturnType<ReadResourceCallback>;
    };
    const name = resourceMeta.mcpName ?? resourceMeta.name;
    if (resourceMeta.uri) {
      this.server.registerResource(name, resourceMeta.uri, resourceMeta.metadata ?? {}, handler);
    } else if (resourceMeta.template) {
      this.server.registerResource(name, resourceMeta.template as unknown as any, resourceMeta.metadata ?? {}, handler);
    } else {
      throw new Error(`MCPResource ${name} must have uri or template`);
    }
  }

  async mcpToolRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    toolMeta: MCPToolMeta,
  ) {
    const controllerMeta = controllerProto.getMetaData(
      CONTROLLER_META_DATA,
    ) as MCPControllerMeta;
    void controllerMeta;
    const name: string = toolMeta.mcpName ?? toolMeta.name;
    const description: string | undefined = toolMeta.description;
    let schema: NonNullable<typeof toolMeta['detail']>['argsSchema'] | undefined;
    if (toolMeta.detail?.argsSchema) {
      schema = toolMeta.detail?.argsSchema;
    }
    const handler = async (...args) => {
      const eggObj = await getOrCreateEggObject(
        controllerProto,
        controllerProto.name,
      );
      const realObj = eggObj.obj;
      const realMethod = realObj[toolMeta.name];
      const newArgs = this.buildToolArgs(args, toolMeta, !!schema);
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<ToolCallback>;
    };
    this.server.registerTool(name, {
      description,
      inputSchema: schema,
    }, handler);
  }

  async mcpPromptRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    promptMeta: MCPPromptMeta,
  ) {
    const name: string = promptMeta.mcpName ?? promptMeta.name;
    const description: string | undefined = promptMeta.description;
    let schema: NonNullable<typeof promptMeta['detail']>['argsSchema'] | undefined;
    if (promptMeta.detail?.argsSchema) {
      schema = promptMeta.detail?.argsSchema;
    }
    const handler = async (...args) => {
      const eggObj = await getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[promptMeta.name];
      const newArgs = this.buildPromptArgs(args, promptMeta, !!schema);
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<PromptCallback>;
    };
    this.server.registerPrompt(name, {
      title: promptMeta.title,
      description,
      argsSchema: schema,
    }, handler);
  }
}
