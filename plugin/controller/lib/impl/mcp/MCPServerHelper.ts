import {
  McpServer,
  ReadResourceCallback,
  ToolCallback,
  PromptCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  MCPControllerHook,
  MCPControllerRegister,
} from './MCPControllerRegister';
import { CONTROLLER_META_DATA, EggObject, EggObjectName, EggPrototype } from '@eggjs/tegg-types';
import { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/tegg';

export interface MCPServerHelperOptions {
  name: string;
  version: string;
  hooks: MCPControllerHook[];
}

export class MCPServerHelper {
  server: McpServer;
  hooks: MCPControllerHook[];
  constructor(opts: MCPServerHelperOptions) {
    this.server = new McpServer(
      {
        name: opts.name,
        version: opts.version,
      },
      { capabilities: { logging: {} } },
    );
    this.hooks = opts.hooks;
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
      return Reflect.apply(
        realMethod,
        realObj,
        args,
      ) as ReturnType<ReadResourceCallback>;
    };
    const name = resourceMeta.mcpName ?? resourceMeta.name;
    if (resourceMeta.uri) {
      if (resourceMeta.metadata) {
        this.server.resource(
          name,
          resourceMeta.uri,
          resourceMeta.metadata,
          handler,
        );
      } else {
        this.server.resource(name, resourceMeta.uri, handler);
      }
    } else if (resourceMeta.template) {
      if (resourceMeta.metadata) {
        this.server.resource(
          name,
          resourceMeta.template,
          resourceMeta.metadata,
          handler,
        );
      } else {
        this.server.resource(name, resourceMeta.template, handler);
      }
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
    const name: string = toolMeta.mcpName ?? toolMeta.name;
    const description: string | undefined = toolMeta.description;
    let schema: NonNullable<typeof toolMeta['detail']>['argsSchema'] | undefined;
    if (toolMeta.detail?.argsSchema) {
      schema = toolMeta.detail?.argsSchema;
    } else if (MCPControllerRegister.hooks.length > 0) {
      for (const hook of MCPControllerRegister.hooks) {
        schema = await hook.schemaLoader?.(controllerMeta, toolMeta);
        if (schema) {
          break;
        }
      }
    }
    const handler = async (...args) => {
      const eggObj = await getOrCreateEggObject(
        controllerProto,
        controllerProto.name,
      );
      const realObj = eggObj.obj;
      const realMethod = realObj[toolMeta.name];
      let newArgs: any[] = [];
      if (schema && toolMeta.detail) {
        // 如果有 schema 则证明入参第一个就是 schema
        newArgs[toolMeta.detail.index] = args[0];

        // 如果有 schema 则证明入参第二个就是 extra
        if (toolMeta.extra) {
          newArgs[toolMeta.extra] = args[1];
        }
      } else if (toolMeta.extra) {
        // 无 schema, 那么入参第一个就是 extra
        newArgs[toolMeta.extra] = args[0];
      }
      newArgs = [ ...newArgs, ...args ];
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<ToolCallback>;
    };
    if (description && schema) {
      this.server.tool(name, description, schema, handler);
    } else if (description) {
      this.server.tool(name, description, handler);
    } else if (schema) {
      this.server.tool(name, schema, handler);
    } else {
      this.server.tool(name, handler);
    }
  }

  async mcpPromptRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    promptMeta: MCPPromptMeta,
  ) {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    const name: string = promptMeta.mcpName ?? promptMeta.name;
    const description: string | undefined = promptMeta.description;
    let schema: NonNullable<typeof promptMeta['detail']>['argsSchema'] | undefined;
    if (promptMeta.detail?.argsSchema) {
      schema = promptMeta.detail?.argsSchema;
    } else if (MCPControllerRegister.hooks.length > 0) {
      for (const hook of MCPControllerRegister.hooks) {
        schema = await hook.schemaLoader?.(controllerMeta, promptMeta);
        if (schema) {
          break;
        }
      }
    }
    const handler = async (...args) => {
      const eggObj = await getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[promptMeta.name];
      let newArgs: any[] = [];
      if (schema && promptMeta.detail) {
        // 如果有 schema 则证明入参第一个就是 schema
        newArgs[promptMeta.detail.index] = args[0];

        // 如果有 schema 则证明入参第二个就是 extra
        if (promptMeta.extra) {
          newArgs[promptMeta.extra] = args[1];
        }
      } else if (promptMeta.extra) {
        // 无 schema, 那么入参第一个就是 extra
        newArgs[promptMeta.extra] = args[0];
      }
      newArgs = [ ...newArgs, ...args ];
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<PromptCallback>;
    };
    if (description && schema) {
      this.server.prompt(name, description, schema, handler);
    } else if (description) {
      this.server.prompt(name, description, handler);
    } else if (schema) {
      this.server.prompt(name, schema, handler);
    } else {
      this.server.prompt(name, handler);
    }
  }
}
