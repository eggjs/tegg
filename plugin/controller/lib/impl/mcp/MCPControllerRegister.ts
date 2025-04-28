import type { Application, Context, Router } from 'egg';

import assert from 'node:assert';
import http, { ServerResponse } from 'node:http';

import {
  ControllerMetadata,
  MCPControllerMeta,
  CONTROLLER_META_DATA,
  MCPPromptMeta,
  MCPResourceMeta,
  MCPToolMeta,
  ControllerType,
} from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { ControllerRegister } from '../../ControllerRegister';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { isInitializeRequest, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { MCPProtocols } from '@eggjs/mcp-proxy';

import getRawBody from 'raw-body';
import contentType from 'content-type';

export interface MCPControllerHook {
  // SSE
  preSSEInitHandle?: (ctx: Context, transport: SSEServerTransport, register: MCPControllerRegister) => Promise<void>
  preHandleInitHandle?: (ctx: Context) => Promise<void>

  // STREAM
  preHandle?: (ctx: Context) => Promise<void>
  onStreamSessionInitialized?: (ctx: Context, transport: StreamableHTTPServerTransport, register: MCPControllerRegister) => Promise<void>

  // COMMON
  preProxy?: (ctx: Context, proxyReq: http.IncomingMessage, proxyResp: http.ServerResponse) => Promise<void>
  schemaLoader?: (controllerMeta: MCPControllerMeta, meta: MCPPromptMeta | MCPToolMeta) => Promise<Parameters<McpServer['tool']>['2'] | Parameters<McpServer['prompt']>['2']>
  checkAndRunProxy?: (ctx: Context, type: MCPProtocols, sessionId: string) => Promise<boolean>;
}


export class MCPControllerRegister implements ControllerRegister {
  static instance?: MCPControllerRegister;
  readonly app: Application;
  private readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly router: Router;
  private controllerProtos: EggPrototype[] = [];
  private registeredControllerProtos: EggPrototype[] = [];
  transports: Record<string, SSEServerTransport> = {};
  sseConnections = new Map<string, { res: ServerResponse, intervalId: NodeJS.Timeout }>();
  private mcpServer: McpServer;
  private controllerMeta: MCPControllerMeta;
  streamTransports: Record<string, StreamableHTTPServerTransport> = {};
  static hooks: MCPControllerHook[] = [];

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application) {
    assert(controllerMeta.type === ControllerType.MCP, 'controller meta type is not MCP');
    if (!MCPControllerRegister.instance) {
      MCPControllerRegister.instance = new MCPControllerRegister(proto, controllerMeta as MCPControllerMeta, app);
    }
    MCPControllerRegister.instance.controllerProtos.push(proto);
    return MCPControllerRegister.instance;
  }

  constructor(_proto: EggPrototype, controllerMeta: MCPControllerMeta, app: Application) {
    this.app = app;
    this.eggContainerFactory = app.eggContainerFactory;
    this.router = app.router;

    this.controllerMeta = controllerMeta;
  }

  static addHook(hook: MCPControllerHook) {
    MCPControllerRegister.hooks.push(hook);
  }

  async mcpStreamServerInit() {
    const allRouterFunc = this.router.all;
    const self = this;
    const initHandler = async (ctx: Context) => {
      ctx.respond = false;
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
          await hook.preHandle?.(self.app.currentContext);
        }
      }
      const sessionId = ctx.req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId) {
        const ct = contentType.parse(ctx.req.headers['content-type'] ?? '');

        let body;

        try {
          const rawBody = await getRawBody(ctx.req, {
            limit: '4mb',
            encoding: ct.parameters.charset ?? 'utf-8',
          });

          body = JSON.parse(rawBody);
        } catch (e) {
          ctx.status = 400;
          ctx.body = {
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: `Bad Request: body should is json, ${e.toString()}`,
            },
            id: null,
          };
          return;
        }

        if (isInitializeRequest(body)) {
          ctx.respond = false;
          const eventStore = this.app.config.mcp?.eventStore ?? new InMemoryEventStore();
          const self = this;
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => this.app.config.mcp?.sessionIdGenerator?.(),
            eventStore,
            onsessioninitialized: async () => {
              if (MCPControllerRegister.hooks.length > 0) {
                for (const hook of MCPControllerRegister.hooks) {
                  await hook.onStreamSessionInitialized?.(self.app.currentContext, transport, self);
                }
              }
            },
          });

          ctx.set({
            'content-type': 'text/event-stream',
            'transfer-encoding': 'chunked',
          });

          await self.mcpServer.connect(transport);

          await ctx.app.ctxStorage.run(ctx, async () => {
            await transport.handleRequest(ctx.req, ctx.res, body);
          });
        } else {
          ctx.status = 400;
          ctx.body = {
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
            },
            id: null,
          };
          return;
        }
      } else if (sessionId) {
        const transport = self.streamTransports[sessionId];
        if (transport) {
          if (MCPControllerRegister.hooks.length > 0) {
            for (const hook of MCPControllerRegister.hooks) {
              await hook.preHandle?.(self.app.currentContext);
            }
          }
          ctx.respond = false;
          ctx.set({
            'content-type': 'text/event-stream',
            'transfer-encoding': 'chunked',
          });
          await ctx.app.ctxStorage.run(ctx, async () => {
            await transport.handleRequest(ctx.req, ctx.res);
          });
          return;
        }
        if (MCPControllerRegister.hooks.length > 0) {
          for (const hook of MCPControllerRegister.hooks) {
            const checked = await hook.checkAndRunProxy?.(self.app.currentContext, MCPProtocols.STREAM, sessionId);
            if (checked) {
              return;
            }
          }
        }
      }
      return;
    };
    Reflect.apply(allRouterFunc, this.router, [
      'chairMcpStreamInit',
      self.app.config.mcp?.streamPath,
      ...[],
      initHandler,
    ]);
  }

  mcpServerInit() {
    const routerFunc = this.router.get;
    // const aclMiddleware = aclMiddlewareFactory(this.controllerMeta, this.methodMeta);
    // if (aclMiddleware) {
    //   methodMiddlewares.push(aclMiddleware);
    // }
    const self = this;
    const initHandler = async (ctx: Context) => {
      const transport = new SSEServerTransport(self.app.config.mcp.sseMessagePath, ctx.res);
      const id = transport.sessionId;
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
          await hook.preSSEInitHandle?.(self.app.currentContext, transport, self);
        }
      }
      // https://github.com/modelcontextprotocol/typescript-sdk/issues/270#issuecomment-2789526821
      const intervalId = setInterval(() => {
        if (self.sseConnections.has(id) && !ctx.res.writableEnded) {
          ctx.res.write(': keepalive\n\n');
        } else {
          clearInterval(intervalId);
          self.sseConnections.delete(id);
        }
      }, self.app.config.mcp?.sseHeartTime ?? 25000);
      self.sseConnections.set(id, { res: ctx.res, intervalId });
      self.transports[id] = transport;
      ctx.set({
        'content-type': 'text/event-stream',
        'transfer-encoding': 'chunked',
      });
      ctx.respond = false;
      await self.mcpServer.connect(transport);
      return self.sseCtxStorageRun.bind(self)(ctx, transport);
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpInit',
      self.app.config.mcp?.sseInitPath,
      ...[],
      initHandler,
    ]);
  }

  sseCtxStorageRun(ctx: Context, transport: SSEServerTransport | StreamableHTTPServerTransport) {
    const closeFunc = transport.onclose;
    transport.onclose = (...args) => {
      closeFunc?.(...args);
    };
    transport.onerror = error => {
      this.app.logger.error('session %s error %o', transport.sessionId, error);
    };
    const messageFunc = transport.onmessage;
    transport.onmessage = async (...args: [ JSONRPCMessage ]) => {
      await ctx.app.ctxStorage.run(ctx, async () => {
        await messageFunc!(...args);
      });
    };
  }

  mcpServerRegister() {
    const routerFunc = this.router.post;
    const self = this;
    // const aclMiddleware = aclMiddlewareFactory(this.controllerMeta, this.methodMeta);
    // if (aclMiddleware) {
    //   methodMiddlewares.push(aclMiddleware);
    // }
    const messageHander = async (ctx: Context) => {
      const sessionId = ctx.query.sessionId;

      if (self.transports[sessionId]) {
        if (MCPControllerRegister.hooks.length > 0) {
          for (const hook of MCPControllerRegister.hooks) {
            await hook.preHandleInitHandle?.(self.app.currentContext);
          }
        }
        self.app.logger.info('message coming', sessionId);
        try {
          await self.transports[sessionId].handlePostMessage(ctx.req, ctx.res);
        } catch (error) {
          self.app.logger.error('Error handling MCP message', error);
          if (!ctx.res.headersSent) {
            ctx.status = 500;
            ctx.body = {
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: `Internal error: ${error.message}`,
              },
              id: null,
            };
          }
        }
        return;
      }
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
          const checked = await hook.checkAndRunProxy?.(self.app.currentContext, MCPProtocols.SSE, sessionId);
          if (checked) {
            return;
          }
        }
      }
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpMessage',
      self.app.config.mcp?.sseMessagePath,
      ...[],
      messageHander,
    ]);
  }

  async mcpPromptRegister(controllerProto: EggPrototype, promptMeta: MCPPromptMeta) {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    const args: any[] = [ promptMeta.mcpName ?? promptMeta.name ];
    if (promptMeta.description) {
      args.push(promptMeta.description);
    }
    let schema;
    if (promptMeta.detail?.argsSchema) {
      schema = promptMeta.detail?.argsSchema;
      args.push(schema);
    } else if (MCPControllerRegister.hooks.length > 0) {
      for (const hook of MCPControllerRegister.hooks) {
        schema = await hook.schemaLoader?.(controllerMeta, promptMeta);
        if (schema) {
          args.push(schema);
          break;
        }
      }
    }
    const self = this;
    const handler = async (...args) => {
      const eggObj = await self.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
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
      return Reflect.apply(realMethod, realObj, newArgs);
    };
    args.push(handler);
    this.mcpServer.prompt(...(args as unknown as [any, any, any, any]));
  }

  async mcpToolRegister(controllerProto: EggPrototype, toolMeta: MCPToolMeta) {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    const args: any[] = [ toolMeta.mcpName ?? toolMeta.name ];
    if (toolMeta.description) {
      args.push(toolMeta.description);
    }
    let schema;
    if (toolMeta.detail?.argsSchema) {
      schema = toolMeta.detail?.argsSchema;
      args.push(toolMeta.detail?.argsSchema);
    } else if (MCPControllerRegister.hooks.length > 0) {
      for (const hook of MCPControllerRegister.hooks) {
        schema = await hook.schemaLoader?.(controllerMeta, toolMeta);
        if (schema) {
          args.push(schema);
          break;
        }
      }
    }
    const self = this;
    const handler = async (...args) => {
      const eggObj = await self.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
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
      return Reflect.apply(realMethod, realObj, newArgs);
    };
    args.push(handler);
    this.mcpServer.tool(...(args as unknown as [any, any, any, any]));
  }

  async mcpResourceRegister(controllerProto: EggPrototype, resourceMeta: MCPResourceMeta) {
    const args: any[] = [ resourceMeta.mcpName ?? resourceMeta.name ];
    if (resourceMeta.uri) {
      args.push(resourceMeta.uri);
    }
    if (resourceMeta.template) {
      const template = resourceMeta.template;
      args.push(template);
    }
    if (resourceMeta.metadata) {
      args.push(resourceMeta.metadata);
    }
    const self = this;
    const handler = async (...args) => {
      const eggObj = await self.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[resourceMeta.name];
      return Reflect.apply(realMethod, realObj, args);
    };
    args.push(handler);
    this.mcpServer.resource(...(args as unknown as [any, any, any, any]));
  }

  async register() {
    const promptMap = new Map<MCPPromptMeta, EggPrototype>();
    const resourceMap = new Map<MCPResourceMeta, EggPrototype>();
    const toolMap = new Map<MCPToolMeta, EggPrototype>();
    for (const proto of this.controllerProtos) {
      if (this.registeredControllerProtos.includes(proto)) {
        continue;
      }
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      for (const prompt of metadata.prompts) {
        promptMap.set(prompt, proto);
      }
      for (const resource of metadata.resources) {
        resourceMap.set(resource, proto);
      }
      for (const tool of metadata.tools) {
        toolMap.set(tool, proto);
      }
      this.registeredControllerProtos.push(proto);
    }
    if (!this.mcpServer) {
      this.mcpServer = new McpServer({
        name: this.controllerMeta.name ?? `chair-mcp-${this.app.name}-server`,
        version: this.controllerMeta.version ?? '1.0.0',
      }, { capabilities: { logging: {} } });
      this.mcpStreamServerInit();
      this.mcpServerInit();
      this.mcpServerRegister();
    }
    for (const [ prompt, controllerProto ] of promptMap.entries()) {
      await this.mcpPromptRegister(controllerProto, prompt);
    }
    for (const [ tool, controllerProto ] of toolMap.entries()) {
      await this.mcpToolRegister(controllerProto, tool);
    }
    for (const [ resource, controllerProto ] of resourceMap.entries()) {
      await this.mcpResourceRegister(controllerProto, resource);
    }
  }
}
