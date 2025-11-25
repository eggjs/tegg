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
  EggContext,
  EggObjectName,
  MCPResourceMeta,
  MCPProtocols,
} from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContainerFactory, EggObject } from '@eggjs/tegg-runtime';
import { ControllerRegister } from '../../ControllerRegister';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest, isJSONRPCRequest, JSONRPCMessage, MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js';
import awaitEvent from 'await-event';
import compose from 'koa-compose';

import getRawBody from 'raw-body';
import contentType from 'content-type';

import { MCPConfig } from './MCPConfig';
import { MCPServerHelper } from './MCPServerHelper';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface MCPControllerHook {
  // SSE
  preSSEInitHandle?: (ctx: Context, transport: SSEServerTransport, register: MCPControllerRegister) => Promise<void>
  preHandleInitHandle?: (ctx: Context) => Promise<void>

  // STREAM
  preHandle?: (ctx: Context) => Promise<void>
  onStreamSessionInitialized?: (ctx: Context, transport: StreamableHTTPServerTransport, server: McpServer, register: MCPControllerRegister) => Promise<void>

  // COMMON
  preProxy?: (ctx: Context, proxyReq: http.IncomingMessage, proxyResp: http.ServerResponse) => Promise<void>
  schemaLoader?: (controllerMeta: MCPControllerMeta, meta: MCPPromptMeta | MCPToolMeta) => Promise<Parameters<McpServer['tool']>['2'] | Parameters<McpServer['prompt']>['2']>
  checkAndRunProxy?: (ctx: Context, type: MCPProtocols, sessionId: string) => Promise<boolean>;

  // middleware
  middlewareStart?: (ctx: Context) => Promise<void>
  middlewareEnd?: (ctx: Context) => Promise<void>
  middlewareError?: (ctx: Context, e: Error) => Promise<void>
}

interface ServerRegisterRecord<T> {
  getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>;
  proto: EggPrototype,
  meta: T,
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
  sseConnections = new Map<
  string,
  { res: ServerResponse; intervalId: NodeJS.Timeout }
  >();
  mcpServerHelperMap: Record<string, () => MCPServerHelper> = {};
  mcpServerMap: Record<string, McpServer> = {};
  statelessMcpServerHelperMap: Record<string, MCPServerHelper> = {};
  private controllerMeta: MCPControllerMeta;
  mcpConfig: MCPConfig;
  statelessTransportMap: Record<string, StreamableHTTPServerTransport> = {};
  streamTransports: Record<string, StreamableHTTPServerTransport> = {};
  // eslint-disable-next-line no-spaced-func
  sseTransportsRequestMap = new Map<
  InnerSSEServerTransport,
  Record<
  string,
  {
    resolve: (value: PromiseLike<null> | null) => void;
    reject: (reason?: any) => void;
  }
  >
  >();
  static hooks: MCPControllerHook[] = [];
  globalMiddlewares: compose.ComposedMiddleware<EggContext>;

  registerMap: Record<string, { tools: ServerRegisterRecord<MCPToolMeta>[], prompts: ServerRegisterRecord<MCPPromptMeta>[], resources: ServerRegisterRecord<MCPResourceMeta>[] }> = {};

  pingIntervals: Record<string, NodeJS.Timeout> = {};

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

  static async connectStatelessStreamTransport(name?: string) {
    if (
      MCPControllerRegister.instance &&
      MCPControllerRegister.instance.statelessTransportMap
    ) {
      const serverHelper =
        MCPControllerRegister.instance.statelessMcpServerHelperMap[
          name ?? 'default'
        ];
      const statelessTransport =
        MCPControllerRegister.instance.statelessTransportMap[name ?? 'default'];
      if (serverHelper && statelessTransport) {
        await serverHelper.server.connect(statelessTransport);
        // 由于 mcp server stateless 需要我们在这里 init
        // 以防止后续请求进入时初次 init 后，请求打到别的进程，而别的进程没有 init
        const socket = new Socket();
        const req = new IncomingMessage(socket);
        const res = new ServerResponse(req);
        req.method = 'POST';
        req.url =
          MCPControllerRegister.instance.mcpConfig.getStatelessStreamPath(name);
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
            capabilities: {},
            clientInfo: {
              name: 'init-client',
              version: '1.0.0',
            },
          },
        };
        await statelessTransport.handleRequest(req, res, initBody);
      }
    }
  }

  static clean() {
    if (this.instance) {
      this.instance.controllerProtos = [];
    }
    this.instance = undefined;
  }

  mcpStatelessStreamServerInit(name?: string) {
    const postRouterFunc = this.router.post;
    const self = this;
    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
    self.statelessTransportMap[name ?? 'default'] = transport;
    let mw = self.app.middleware.teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([ mw, self.globalMiddlewares ]);
    }
    const onmessage = transport.onmessage;

    transport.onmessage = async (message: JSONRPCMessage, extra?: MessageExtraInfo) => {
      if (self.app.currentContext) {
        self.app.currentContext.mcpArg = message;
      }
      onmessage && await onmessage(message, extra);
    };
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
          await transport.handleRequest(ctx.req, ctx.res);
          await awaitEvent(ctx.res, 'close');
        });
      });
      return;
    };
    Reflect.apply(postRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      self.mcpConfig.getStatelessStreamPath(name),
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
      self.mcpConfig.getStatelessStreamPath(name),
      ...[],
      notHandler,
    ]);
    Reflect.apply(delRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      self.mcpConfig.getStatelessStreamPath(name),
      ...[],
      notHandler,
    ]);
  }

  mcpStreamServerInit(name?: string) {
    const allRouterFunc = this.router.all;
    const self = this;
    let mw = self.app.middleware.teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([ mw, self.globalMiddlewares ]);
    }
    const initHandler = async (ctx: Context) => {
      ctx.respond = false;
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
          await hook.preHandle?.(self.app.currentContext);
        }
      }
      const sessionId = ctx.req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId) {
        const ct = contentType.parse(ctx.req.headers['content-type'] || 'application/json');

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
          const eventStore = this.mcpConfig.getEventStore();
          const self = this;
          const mcpServerHelper = self.mcpServerHelperMap[name ?? 'default']();
          for (const tool of self.registerMap[name ?? 'default'].tools) {
            await mcpServerHelper.mcpToolRegister(
              tool.getOrCreateEggObject,
              tool.proto,
              tool.meta,
            );
          }
          for (const resource of self.registerMap[name ?? 'default'].resources) {
            await mcpServerHelper.mcpResourceRegister(
              resource.getOrCreateEggObject,
              resource.proto,
              resource.meta,
            );
          }
          for (const prompt of self.registerMap[name ?? 'default'].prompts) {
            await mcpServerHelper.mcpPromptRegister(
              prompt.getOrCreateEggObject,
              prompt.proto,
              prompt.meta,
            );
          }
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () =>
              this.mcpConfig.getSessionIdGenerator(name)(ctx),
            eventStore,
            onsessioninitialized: async sessionId => {
              if (MCPControllerRegister.hooks.length > 0) {
                for (const hook of MCPControllerRegister.hooks) {
                  await hook.onStreamSessionInitialized?.(
                    self.app.currentContext,
                    transport,
                    mcpServerHelper.server,
                    self,
                  );
                }
              }
              if (self.mcpConfig.getStreamPingEnabled(name)) {
                self.mcpServerPing(mcpServerHelper.server.server, sessionId, name);
              }
            },
          });

          ctx.set({
            'content-type': 'text/event-stream',
            'transfer-encoding': 'chunked',
          });

          await mcpServerHelper.server.connect(transport);

          transport.onclose = async () => {
            if (transport.sessionId && self.pingIntervals[transport.sessionId]) {
              clearInterval(self.pingIntervals[transport.sessionId]);
              delete self.pingIntervals[transport.sessionId];
            }
          };

          const onmessage = transport.onmessage;

          transport.onmessage = async (message: JSONRPCMessage, extra?: MessageExtraInfo) => {
            if (self.app.currentContext) {
              self.app.currentContext.mcpArg = message;
            }
            onmessage && await onmessage(message, extra);
          };

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
            const checked = await hook.checkAndRunProxy?.(
              self.app.currentContext,
              MCPProtocols.STREAM,
              sessionId,
            );
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
      self.mcpConfig.getStreamPath(name),
      ...[],
      initHandler,
    ]);
  }

  mcpServerInit(name?: string) {
    const routerFunc = this.router.get;
    // const aclMiddleware = aclMiddlewareFactory(this.controllerMeta, this.methodMeta);
    // if (aclMiddleware) {
    //   methodMiddlewares.push(aclMiddleware);
    // }
    const self = this;
    const initHandler = async (ctx: Context) => {
      const transport = new InnerSSEServerTransport(
        self.mcpConfig.getSseMessagePath(name),
        ctx.res,
      );
      const id = transport.sessionId;
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
          await hook.preSSEInitHandle?.(
            self.app.currentContext,
            transport,
            self,
          );
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
      }, self.mcpConfig.getSseHeartTime(name));
      self.sseConnections.set(id, { res: ctx.res, intervalId });
      self.transports[id] = transport;
      ctx.set({
        'content-type': 'text/event-stream',
        'transfer-encoding': 'chunked',
      });
      ctx.respond = false;
      const mcpServerHelper = self.mcpServerHelperMap[name ?? 'default']();
      for (const tool of self.registerMap[name ?? 'default'].tools) {
        mcpServerHelper.mcpToolRegister(
          tool.getOrCreateEggObject,
          tool.proto,
          tool.meta,
        );
      }
      for (const resource of self.registerMap[name ?? 'default'].resources) {
        mcpServerHelper.mcpResourceRegister(
          resource.getOrCreateEggObject,
          resource.proto,
          resource.meta,
        );
      }
      for (const prompt of self.registerMap[name ?? 'default'].prompts) {
        mcpServerHelper.mcpPromptRegister(
          prompt.getOrCreateEggObject,
          prompt.proto,
          prompt.meta,
        );
      }
      await mcpServerHelper.server.connect(transport);
      self.mcpServerMap[id] = mcpServerHelper.server;
      if (self.mcpConfig.getSsePingEnabled(name)) {
        self.mcpServerPing(mcpServerHelper.server.server, transport.sessionId, name);
      }
      return self.sseCtxStorageRun.bind(self)(ctx, transport, name);
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpInit',
      self.mcpConfig.getSseInitPath(name),
      ...[],
      initHandler,
    ]);
  }

  sseCtxStorageRun(ctx: Context, transport: SSEServerTransport, name?: string) {
    const self = this;
    let mw = this.app.middleware.teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([ mw, self.globalMiddlewares ]);
    }
    const closeFunc = transport.onclose;
    transport.onclose = (...args) => {
      closeFunc?.(...args);
      delete self.transports[transport.sessionId];
      delete self.mcpServerMap[transport.sessionId];
      if (transport.sessionId && self.pingIntervals[transport.sessionId]) {
        clearInterval(self.pingIntervals[transport.sessionId]);
        delete self.pingIntervals[transport.sessionId];
      }
      self.sseTransportsRequestMap.delete(transport);
      const connection = self.sseConnections.get(transport.sessionId);
      if (connection) {
        clearInterval(connection.intervalId);
        self.sseConnections.delete(transport.sessionId);
      }
    };
    transport.onerror = error => {
      self.app.logger.error('session %s error %o', transport.sessionId, error);
    };
    const messageFunc = transport.onmessage;
    self.sseTransportsRequestMap.set(transport, {});
    transport.onmessage = async (message: JSONRPCMessage, extra?: MessageExtraInfo) => {
      const args = [ message, extra ];
      // 这里需要 new 一个新的 ctx，否则 ContextProto 会未被初始化
      const socket = new Socket();
      const req = new IncomingMessage(socket);
      const res = new ServerResponse(req);
      req.method = 'POST';
      req.url = self.mcpConfig.getSseInitPath(name);
      req.headers = {
        ...ctx.req.headers,
        ...extra?.requestInfo?.headers,
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      };
      const newCtx = self.app.createContext(req, res) as unknown as Context;
      await ctx.app.ctxStorage.run(newCtx, async () => {
        await mw(newCtx, async () => {
          if (MCPControllerRegister.hooks.length > 0) {
            for (const hook of MCPControllerRegister.hooks) {
              await hook.preHandle?.(newCtx);
            }
          }
          messageFunc!(message, extra);
          if (isJSONRPCRequest(args[0])) {
            const map = self.sseTransportsRequestMap.get(transport)!;
            const wait = new Promise<null>((resolve, reject) => {
              if (extra && 'id' in extra) {
                map[extra.id as string] = { resolve, reject };
              }
            });
            await wait;
          }
        });
      });
    };
  }

  mcpServerRegister(name?: string) {
    const routerFunc = this.router.post;
    const self = this;
    // const aclMiddleware = aclMiddlewareFactory(this.controllerMeta, this.methodMeta);
    // if (aclMiddleware) {
    //   methodMiddlewares.push(aclMiddleware);
    // }

    let mw = self.app.middleware.teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([ mw, self.globalMiddlewares ]);
    }
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
          const ct = contentType.parse(ctx.req.headers['content-type'] ?? '');

          const rawBody = await getRawBody(ctx.req, {
            limit: '4mb',
            encoding: ct.parameters.charset ?? 'utf-8',
          });

          const body = JSON.parse(rawBody);
          ctx.mcpArg = body;
          await self.transports[sessionId].handlePostMessage(ctx.req, ctx.res, body);
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
          const checked = await hook.checkAndRunProxy?.(
            self.app.currentContext,
            MCPProtocols.SSE,
            sessionId,
          );
          if (checked) {
            return;
          }
        }
      }
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpMessage',
      self.mcpConfig.getSseMessagePath(name),
      ...[ mw ],
      messageHander,
    ]);
  }

  getGlobalMiddleware() {
    const middlewareNames = this.app.config.mcp.middleware || [];
    const middlewares: compose.Middleware<EggContext>[] = [];
    for (const name of middlewareNames) {
      const middlewareFactory = (this.app as unknown as any).middlewares[name];
      if (!middlewareFactory) {
        throw new TypeError(`Middleware ${name} not found`);
      }
      const options = (this.app.config as any)[name] || {};
      const mw = middlewareFactory(options, this.app);
      (mw as any)._name = name;
      middlewares.push(mw);
    }
    this.globalMiddlewares = compose(middlewares);
  }

  mcpServerPing(server: Server, sessionId: string, name?: string) {
    const duration = this.mcpConfig.getPingElapsed(name);
    const interval = this.mcpConfig.getPingInterval(name);

    const startTime = Date.now();

    const timerId = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      try {
        await server.ping();
      } catch (e) {
        this.app.logger.warn('mcp server ping failed: ', e);
      } finally {
        if (elapsed >= duration) {
          if (this.pingIntervals[sessionId]) {
            clearInterval(this.pingIntervals[sessionId]);
            delete this.pingIntervals[sessionId];
          }
        }
      }
    }, interval);

    this.pingIntervals[sessionId] = timerId;
  }

  async register() {
    for (const proto of this.controllerProtos) {
      if (this.registeredControllerProtos.includes(proto)) {
        continue;
      }
      const metadata = proto.getMetaData(
        CONTROLLER_META_DATA,
      ) as MCPControllerMeta;
      if (!this.mcpServerHelperMap[metadata.name ?? 'default']) {
        this.getGlobalMiddleware();
        this.mcpServerHelperMap[metadata.name ?? 'default'] = () => {
          return new MCPServerHelper({
            name:
              this.controllerMeta.name ??
              `chair-mcp-${metadata.name ?? this.app.name}-server`,
            version: this.controllerMeta.version ?? '1.0.0',
            hooks: MCPControllerRegister.hooks,
          });
        };
        this.statelessMcpServerHelperMap[metadata.name ?? 'default'] =
          new MCPServerHelper({
            name:
              this.controllerMeta.name ??
              `chair-mcp-${metadata.name ?? this.app.name}-server`,
            version: this.controllerMeta.version ?? '1.0.0',
            hooks: MCPControllerRegister.hooks,
          });
        this.mcpStatelessStreamServerInit(metadata.name);
        this.mcpStreamServerInit(metadata.name);
        this.mcpServerInit(metadata.name);
        this.mcpServerRegister(metadata.name);
        if (metadata.name) {
          this.mcpConfig.setMultipleServerPath(this.app, metadata.name);
        }
      }
      const statelessMcpServerHelper =
        this.statelessMcpServerHelperMap[metadata.name ?? 'default'];
      for (const prompt of metadata.prompts) {
        if (!this.registerMap[metadata.name ?? 'default']) {
          this.registerMap[metadata.name ?? 'default'] = {
            prompts: [],
            resources: [],
            tools: [],
          };
        }
        this.registerMap[metadata.name ?? 'default'].prompts.push({
          getOrCreateEggObject: this.eggContainerFactory.getOrCreateEggObject.bind(
            this.eggContainerFactory,
          ),
          proto,
          meta: prompt,
        });
        await statelessMcpServerHelper.mcpPromptRegister(
          this.eggContainerFactory.getOrCreateEggObject.bind(
            this.eggContainerFactory,
          ),
          proto,
          prompt,
        );
      }
      for (const resource of metadata.resources) {
        if (!this.registerMap[metadata.name ?? 'default']) {
          this.registerMap[metadata.name ?? 'default'] = {
            prompts: [],
            resources: [],
            tools: [],
          };
        }
        this.registerMap[metadata.name ?? 'default'].resources.push({
          getOrCreateEggObject: this.eggContainerFactory.getOrCreateEggObject.bind(
            this.eggContainerFactory,
          ),
          proto,
          meta: resource,
        });
        await statelessMcpServerHelper.mcpResourceRegister(
          this.eggContainerFactory.getOrCreateEggObject.bind(
            this.eggContainerFactory,
          ),
          proto,
          resource,
        );
      }
      for (const tool of metadata.tools) {
        if (!this.registerMap[metadata.name ?? 'default']) {
          this.registerMap[metadata.name ?? 'default'] = {
            prompts: [],
            resources: [],
            tools: [],
          };
        }
        this.registerMap[metadata.name ?? 'default'].tools.push({
          getOrCreateEggObject: this.eggContainerFactory.getOrCreateEggObject.bind(
            this.eggContainerFactory,
          ),
          proto,
          meta: tool,
        });
        await statelessMcpServerHelper.mcpToolRegister(
          this.eggContainerFactory.getOrCreateEggObject.bind(
            this.eggContainerFactory,
          ),
          proto,
          tool,
        );
      }
      this.registeredControllerProtos.push(proto);
    }
  }
}
