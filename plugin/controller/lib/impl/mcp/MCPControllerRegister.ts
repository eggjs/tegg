import type { Application, Context, Router } from 'egg';

import assert from 'node:assert';
import http, { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';

import {
  ControllerMetadata,
  MCPControllerMeta,
  CONTROLLER_META_DATA,
  MCPPromptMeta,
  MCPToolMeta,
  ControllerType,
} from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { ControllerRegister } from '../../ControllerRegister';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest, isJSONRPCRequest, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { MCPProtocols } from '@eggjs/mcp-proxy/types';
import awaitEvent from 'await-event';

import getRawBody from 'raw-body';
import contentType from 'content-type';

import { MCPConfig } from './MCPConfig';
import { MCPServerHelper } from './MCPServerHelper';

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


class InnerSSEServerTransport extends SSEServerTransport {
  async send(message: JSONRPCMessage) {
    let res: null | Error = null;
    try {
      await super.send(message);
    } catch (e) {
      res = e as Error;
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const map = MCPControllerRegister.instance?.sseTransportsRequestMap.get(this);
      if (map && 'id' in message) {
        const { resolve, reject } = map[message.id] ?? {};
        if (resolve) {
          res ? reject(res) : resolve(res);
          delete map[message.id];
        }
      }
    }
  }
}


export class MCPControllerRegister implements ControllerRegister {
  static instance?: MCPControllerRegister;
  readonly app: Application;
  readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly router: Router;
  private controllerProtos: EggPrototype[] = [];
  private registeredControllerProtos: EggPrototype[] = [];
  transports: Record<string, InnerSSEServerTransport> = {};
  sseConnections = new Map<string, { res: ServerResponse, intervalId: NodeJS.Timeout }>();
  mcpServerHelper: MCPServerHelper;
  statelessMcpServerHelper: MCPServerHelper;
  private controllerMeta: MCPControllerMeta;
  private mcpConfig: MCPConfig;
  statelessTransport: StreamableHTTPServerTransport;
  streamTransports: Record<string, StreamableHTTPServerTransport> = {};
  // eslint-disable-next-line no-spaced-func
  sseTransportsRequestMap = new Map<
  InnerSSEServerTransport,
  Record<string, {
    resolve: (value: PromiseLike<null> | null) => void,
    reject: (reason?: any) => void,
  }
  >>();
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

    this.mcpConfig = new MCPConfig(app.config.mcp);
  }

  static addHook(hook: MCPControllerHook) {
    MCPControllerRegister.hooks.push(hook);
  }

  static async connectStatelessStreamTransport() {
    if (MCPControllerRegister.instance && MCPControllerRegister.instance.statelessTransport) {
      await MCPControllerRegister.instance.statelessMcpServerHelper.server.connect(MCPControllerRegister.instance.statelessTransport);
      // 由于 mcp server stateless 需要我们在这里 init
      // 以防止后续请求进入时初次 init 后，请求打到别的进程，而别的进程没有 init
      const socket = new Socket();
      const req = new IncomingMessage(socket);
      const res = new ServerResponse(req);
      req.method = 'POST';
      req.url = MCPControllerRegister.instance.mcpConfig.statelessStreamPath;
      req.headers = {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      };
      const initBody = {
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
          },
          clientInfo: {
            name: 'init-client',
            version: '1.0.0',
          },
        },
      };
      await MCPControllerRegister.instance.statelessTransport.handleRequest(req, res, initBody);
    }
  }

  static clean() {
    if (this.instance) {
      this.instance.controllerProtos = [];
    }
    this.instance = undefined;
  }

  mcpStatelessStreamServerInit() {
    const postRouterFunc = this.router.post;
    const self = this;
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    self.statelessTransport = transport;
    const mw = self.app.middleware.teggCtxLifecycleMiddleware();
    const initHandler = async (ctx: Context) => {
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
        await mw(ctx, async () => {
          await self.statelessTransport.handleRequest(ctx.req, ctx.res);
          await awaitEvent(ctx.res, 'close');
        });
      });
      return;
    };
    Reflect.apply(postRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      this.mcpConfig.statelessStreamPath,
      ...[],
      initHandler,
    ]);
    // stateless 只支持 post
    const getRouterFunc = this.router.get;
    const delRouterFunc = this.router.del;
    const notHandler = async (ctx: Context) => {
      ctx.status = 405;
      ctx.body = {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      };
    };
    Reflect.apply(getRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      this.mcpConfig.statelessStreamPath,
      ...[],
      notHandler,
    ]);
    Reflect.apply(delRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      this.mcpConfig.statelessStreamPath,
      ...[],
      notHandler,
    ]);
  }

  mcpStreamServerInit() {
    const allRouterFunc = this.router.all;
    const self = this;
    const mw = self.app.middleware.teggCtxLifecycleMiddleware();
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
          const eventStore = this.mcpConfig.eventStore;
          const self = this;
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => this.mcpConfig.sessionIdGenerator(ctx),
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

          await self.mcpServerHelper.server.connect(transport);

          await ctx.app.ctxStorage.run(ctx, async () => {
            await mw(ctx, async () => {
              await transport.handleRequest(ctx.req, ctx.res, body);
              await awaitEvent(ctx.res, 'close');
            });
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
            await mw(ctx, async () => {
              await transport.handleRequest(ctx.req, ctx.res);
              await awaitEvent(ctx.res, 'close');
            });
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
      self.mcpConfig.streamPath,
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
      const transport = new InnerSSEServerTransport(self.mcpConfig.sseMessagePath, ctx.res);
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
      }, self.mcpConfig.sseHeartTime);
      self.sseConnections.set(id, { res: ctx.res, intervalId });
      self.transports[id] = transport;
      ctx.set({
        'content-type': 'text/event-stream',
        'transfer-encoding': 'chunked',
      });
      ctx.respond = false;
      await self.mcpServerHelper.server.connect(transport);
      return self.sseCtxStorageRun.bind(self)(ctx, transport);
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpInit',
      self.mcpConfig.sseInitPath,
      ...[],
      initHandler,
    ]);
  }

  sseCtxStorageRun(ctx: Context, transport: SSEServerTransport) {
    const self = this;
    const mw = this.app.middleware.teggCtxLifecycleMiddleware();
    const closeFunc = transport.onclose;
    transport.onclose = (...args) => {
      closeFunc?.(...args);
      delete self.transports[transport.sessionId];
      self.sseTransportsRequestMap.delete(transport);
    };
    transport.onerror = error => {
      self.app.logger.error('session %s error %o', transport.sessionId, error);
    };
    const messageFunc = transport.onmessage;
    self.sseTransportsRequestMap.set(transport, {});
    transport.onmessage = async (...args: [ JSONRPCMessage ]) => {
      // 这里需要 new 一个新的 ctx，否则 ContextProto 会未被初始化
      const socket = new Socket();
      const req = new IncomingMessage(socket);
      const res = new ServerResponse(req);
      req.method = 'POST';
      req.url = self.mcpConfig.sseInitPath;
      req.headers = {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      };
      const newCtx = self.app.createContext(req, res) as unknown as Context;
      await ctx.app.ctxStorage.run(newCtx, async () => {
        await mw(newCtx, async () => {
          messageFunc!(...args);
          if (isJSONRPCRequest(args[0])) {
            const map = self.sseTransportsRequestMap.get(transport)!;
            const wait = new Promise<null>((resolve, reject) => {
              if ('id' in args[0]) {
                map[args[0].id] = { resolve, reject };
              }
            });
            await wait;
          }
        });
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
      self.mcpConfig.sseMessagePath,
      ...[],
      messageHander,
    ]);
  }

  async register() {
    if (!this.mcpServerHelper) {
      this.mcpServerHelper = new MCPServerHelper({
        name: this.controllerMeta.name ?? `chair-mcp-${this.app.name}-server`,
        version: this.controllerMeta.version ?? '1.0.0',
        hooks: MCPControllerRegister.hooks,
      });
      this.statelessMcpServerHelper = new MCPServerHelper({
        name: this.controllerMeta.name ?? `chair-mcp-${this.app.name}-server`,
        version: this.controllerMeta.version ?? '1.0.0',
        hooks: MCPControllerRegister.hooks,
      });
      this.mcpStatelessStreamServerInit();
      this.mcpStreamServerInit();
      this.mcpServerInit();
      this.mcpServerRegister();
    }
    for (const proto of this.controllerProtos) {
      if (this.registeredControllerProtos.includes(proto)) {
        continue;
      }
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      for (const prompt of metadata.prompts) {
        await this.mcpServerHelper.mcpPromptRegister(this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory), proto, prompt);
        await this.statelessMcpServerHelper.mcpPromptRegister(this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory), proto, prompt);
      }
      for (const resource of metadata.resources) {
        await this.mcpServerHelper.mcpResourceRegister(this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory), proto, resource);
        await this.statelessMcpServerHelper.mcpResourceRegister(this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory), proto, resource);
      }
      for (const tool of metadata.tools) {
        await this.mcpServerHelper.mcpToolRegister(this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory), proto, tool);
        await this.statelessMcpServerHelper.mcpToolRegister(this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory), proto, tool);
      }
      this.registeredControllerProtos.push(proto);
    }
  }
}
