import type { Application, Context, Router } from 'egg';

import assert from 'node:assert';
import { ServerResponse } from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import querystring from 'node:querystring';
import url from 'node:url';

import {
  ControllerMetadata,
  MCPControllerMeta,
  CONTROLLER_META_DATA,
  MCPPromptMeta,
  MCPResourceMeta,
  MCPToolMeta,
  ControllerType,
  MCPControllerHook,
} from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { ControllerRegister } from '../../ControllerRegister';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import getRawBody from 'raw-body';
import contentType from 'content-type';

export class MCPControllerRegister implements ControllerRegister {
  static instance?: MCPControllerRegister;
  private readonly app: Application;
  private readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly router: Router;
  private controllerProtos: EggPrototype[] = [];
  private registeredControllerProtos: EggPrototype[] = [];
  private transports: Record<string, SSEServerTransport> = {};
  private sseConnections = new Map<string, { res: ServerResponse, intervalId: NodeJS.Timeout }>();
  private mcpServer: McpServer;
  private controllerMeta: MCPControllerMeta;
  private streamTransports: Record<string, StreamableHTTPServerTransport> = {};
  private hook: MCPControllerHook;

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

  static setHook(hook: MCPControllerHook) {
    if (MCPControllerRegister.instance) {
      MCPControllerRegister.instance.hook = hook;
    }
  }

  async mcpStreamServerInit() {
    const allRouterFunc = this.router.all;
    const self = this;
    const initHandler = async (ctx: Context) => {
      ctx.respond = false;
      ctx.set({
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'transfer-encoding': 'chunked',
        'X-Accel-Buffering': 'no',
      });
      if (self.hook) {
        await self.hook.preHandle?.(self.app.currentContext);
      }
      const sessionId = ctx.req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId) {
        const ct = contentType.parse(ctx.req.headers['content-type'] ?? '');

        const body = JSON.parse(await getRawBody(ctx.req, {
          limit: '4mb',
          encoding: ct.parameters.charset ?? 'utf-8',
        }));

        if (isInitializeRequest(body)) {
          ctx.respond = false;
          ctx.set({
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'transfer-encoding': 'chunked',
          });
          const eventStore = new InMemoryEventStore();
          const self = this;
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            eventStore,
            onsessioninitialized: async sessionId => {
              self.streamTransports[sessionId] = transport;
              this.app.mcpProxy.setProxyHandler('STREAM', async (req, res) => {
                if (self.hook) {
                  await self.hook.preProxy?.(self.app.currentContext, req, res);
                }
                const sessionId = req.headers['mcp-session-id'] as string | undefined;
                if (!sessionId) {
                  res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                      code: -32603,
                      message: 'session id not have and run in proxy',
                    },
                    id: null,
                  });
                } else {
                  let transport: StreamableHTTPServerTransport;
                  const existingTransport = self.streamTransports[sessionId];
                  if (existingTransport instanceof StreamableHTTPServerTransport) {
                    transport = existingTransport;
                  } else {
                    res.status(400).json({
                      jsonrpc: '2.0',
                      error: {
                        code: -32000,
                        message: 'Bad Request: Session exists but uses a different transport protocol',
                      },
                      id: null,
                    });
                    return;
                  }
                  if (transport) {
                    await transport.handleRequest(req, res);
                  } else {
                    res.status(400).send('No transport found for sessionId');
                  }
                }
              });
              await this.app.mcpProxy.registerClient(sessionId, process.pid);
            },
          });
          transport.onclose = async () => {
            const sid = transport.sessionId;
            if (sid && self.streamTransports[sid]) {
              delete self.streamTransports[sid];
            }
            await this.app.mcpProxy.unregisterClient(sid!);
          };
          await self.mcpServer.connect(transport);

          await transport.handleRequest(ctx.req, ctx.res, body);
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
        const pid = await this.app.mcpProxy.getClient(sessionId);
        if (pid !== process.pid) {
          await this.app.mcpProxy.proxyMessage(ctx, {
            pid: pid!,
            sessionId,
            type: 'STREAM',
          });
        } else {
          ctx.respond = false;
          ctx.set({
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'transfer-encoding': 'chunked',
          });
          const transport = self.streamTransports[sessionId];
          await transport.handleRequest(ctx.req, ctx.res);
        }
      }
      return;
    };
    Reflect.apply(allRouterFunc, this.router, [
      'chairMcpStreamInit',
      '/mcp/stream',
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
      ctx.respond = false;
      ctx.set({
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'transfer-encoding': 'chunked',
        'X-Accel-Buffering': 'no',
      });
      const transport = new SSEServerTransport('/mcp/message', ctx.res);
      const id = transport.sessionId;
      if (self.hook) {
        await self.hook.preHandle?.(self.app.currentContext);
      }
      // https://github.com/modelcontextprotocol/typescript-sdk/issues/270#issuecomment-2789526821
      const intervalId = setInterval(() => {
        if (self.sseConnections.has(id) && !ctx.res.writableEnded) {
          ctx.res.write(': keepalive\n\n');
        } else {
          clearInterval(intervalId);
          self.sseConnections.delete(id);
        }
      }, 25000);
      self.sseConnections.set(id, { res: ctx.res, intervalId });
      self.transports[id] = transport;
      // cluster proxy
      await self.app.mcpProxy.registerClient(id, process.pid);
      this.app.mcpProxy.setProxyHandler('SSE', async (req, res) => {
        const sessionId = req.query?.sessionId ?? querystring.parse(url.parse(req.url).query ?? '').sessionId as string;
        if (self.hook) {
          await self.hook.preProxy?.(self.app.currentContext, req, res);
        }
        let transport: SSEServerTransport;
        const existingTransport = self.transports[sessionId];
        if (existingTransport instanceof SSEServerTransport) {
          transport = existingTransport;
        } else {
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: Session exists but uses a different transport protocol',
            },
            id: null,
          });
          return;
        }
        if (transport) {
          await transport.handlePostMessage(req, res);
        } else {
          res.status(400).send('No transport found for sessionId');
        }
      });
      ctx.res.on('close', () => {
        delete self.transports[id];
        const connection = self.sseConnections.get(id);
        if (connection) {
          clearInterval(connection.intervalId);
          self.sseConnections.delete(id);
        }
        self.app.mcpProxy.unregisterClient(id);
      });
      await self.mcpServer.connect(transport);
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpInit',
      '/mcp/init',
      ...[],
      initHandler,
    ]);
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
      const pid = await self.app.mcpProxy.getClient(sessionId);
      if (!pid) {
        throw new Error('not found session: ' + sessionId);
      }
      if (pid !== process.pid) {
        self.app.logger.info('proxy message', sessionId, pid);
        await self.app.mcpProxy.proxyMessage(ctx, { pid, sessionId, type: 'SSE' });
      } else {
        if (self.hook) {
          await self.hook.preHandle?.(self.app.currentContext);
        }
        self.app.logger.info('message coming', sessionId);
        await self.transports[sessionId].handlePostMessage(ctx.req, ctx.res);
      }
      return;
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpMessage',
      '/mcp/message',
      ...[],
      messageHander,
    ]);
  }

  async mcpPromptRegister(controllerProto: EggPrototype, promptMeta: MCPPromptMeta, oneapiMeta: any) {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    let schemaName;
    let filePath;
    if (oneapiMeta) {
      const relativeFilePath = oneapiMeta.apis[`${controllerMeta.className}.${promptMeta.name}`]?.relativeFilePath;
      if (!relativeFilePath) {
        this.app.logger.warn(`${controllerMeta.className}.${promptMeta.name} is not found in oneapi meta json`);
      } else {
        filePath = path.join(this.app.baseDir, relativeFilePath).replace('.ts', '');
        schemaName = oneapiMeta.apis[`${controllerMeta.className}.${promptMeta.name}`]?.meta?.request?.[0]?.schema?.title;
      }
    }
    const args: any[] = [ promptMeta.mcpName ?? promptMeta.name ];
    if (promptMeta.description) {
      args.push(promptMeta.description);
    }
    if (promptMeta.schema) {
      args.push(promptMeta.schema);
    } else if (schemaName && filePath) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const schema = require(filePath)[schemaName];
      args.push(schema);
    }
    const self = this;
    const handler = async (...args) => {
      const eggObj = await self.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[promptMeta.name];
      return Reflect.apply(realMethod, realObj, args);
    };
    args.push(handler);
    this.mcpServer.prompt(...(args as unknown as [any, any, any, any]));
  }

  async mcpToolRegister(controllerProto: EggPrototype, toolMeta: MCPToolMeta, oneapiMeta: any) {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    let schemaName;
    let filePath;
    if (oneapiMeta) {
      const relativeFilePath = oneapiMeta.apis[`${controllerMeta.className}.${toolMeta.name}`]?.relativeFilePath;
      if (!relativeFilePath) {
        this.app.logger.warn(`${controllerMeta.className}.${toolMeta.name} is not found in oneapi meta json`);
      } else {
        filePath = path.join(this.app.baseDir, relativeFilePath).replace('.ts', '');
        schemaName = oneapiMeta.apis[`${controllerMeta.className}.${toolMeta.name}`]?.meta?.request?.[0]?.schema?.title;
      }
    }
    const args: any[] = [ toolMeta.mcpName ?? toolMeta.name ];
    if (toolMeta.description) {
      args.push(toolMeta.description);
    }
    if (toolMeta.schema) {
      args.push(toolMeta.schema);
    } else if (schemaName && filePath) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const schema = require(filePath)[schemaName];
      args.push(schema);
    }
    const self = this;
    const handler = async (...args) => {
      const eggObj = await self.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[toolMeta.name];
      return Reflect.apply(realMethod, realObj, args);
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
    let oneapiMeta;
    try {
      const metadata = await fs.readFile(path.join(this.app.baseDir, '.oneapi/metadata.json'), 'utf8');
      oneapiMeta = JSON.parse(metadata);
    } catch (e) {
      this.app.logger.warn('mcp controller register warn: not found oneapi metadata, please run oneapi:server or set schema to mcp decorator');
    }
    for (const prompt of promptMap.keys()) {
      const controllerProto = promptMap.get(prompt)!;
      await this.mcpPromptRegister(controllerProto, prompt, oneapiMeta);
    }
    for (const tool of toolMap.keys()) {
      const controllerProto = toolMap.get(tool)!;
      await this.mcpToolRegister(controllerProto, tool, oneapiMeta);
    }
    for (const resource of resourceMap.keys()) {
      const controllerProto = resourceMap.get(resource)!;
      await this.mcpResourceRegister(controllerProto, resource);
    }
  }
}
