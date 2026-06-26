import { APIClientBase } from 'cluster-client';
import { MCPProxyDataClient } from './lib/MCPProxyDataClient';
import { Application, Context, EggLogger, Messenger } from 'egg';
import getRawBody from 'raw-body';
import contentType from 'content-type';
import { fetch, Agent } from 'undici';
import http from 'http';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Readable } from 'node:stream';
import cluster from 'node:cluster';
import { MCPControllerRegister, MCPControllerHook } from '@eggjs/tegg-controller-plugin/lib/impl/mcp/MCPControllerRegister';
import querystring from 'node:querystring';
import url from 'node:url';
import compose from 'koa-compose';
import { MCPProtocols } from '@eggjs/tegg-types';

const MAXIMUM_MESSAGE_SIZE = '4mb';

export interface MCPProxyPayload {
  sessionId: string;
  message: unknown;
}

type ProxyAction = 'MCP_STDIO_PROXY' | 'MCP_SEE_PROXY' | 'MCP_STREAM_PROXY';
type StreamProxyHandler = StreamableHTTPServerTransport['handleRequest'];
type SseProxyHandler = SSEServerTransport['handlePostMessage'];

export interface ProxyMessageOptions {
  detail: ClientDetail;
  sessionId: string;
  type: MCPProtocols;
}

export interface ClientDetail {
  pid: number;
  port: number;
}

const IGNORE_HEADERS = [
  'connection',
  'content-length',
  'host',
  'upgrade',
  'keep-alive',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
];

function buildProxyRequestHeaders(headers: http.IncomingHttpHeaders, action: ProxyAction, sessionId: string) {
  const proxyHeaders: Record<string, string> = {
    'mcp-proxy-type': action,
    'mcp-proxy-sessionid': sessionId,
  };
  for (const [ key, value ] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (IGNORE_HEADERS.includes(lowerKey) || value === undefined) {
      continue;
    }
    proxyHeaders[lowerKey] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return proxyHeaders;
}

const streamProxyHandlerMap = new WeakMap<MCPControllerRegister, StreamProxyHandler>();
const sseProxyHandlerMap = new WeakMap<MCPControllerRegister, SseProxyHandler>();

function getSseProxyHandler(self: MCPControllerRegister): SseProxyHandler {
  let handler = sseProxyHandlerMap.get(self);
  if (handler) {
    return handler;
  }
  handler = async (req, res) => {
    const sessionId = querystring.parse(url.parse(req.url!).query ?? '').sessionId as string;
    const ctx = self.app.createContext(req, res) as unknown as Context;
    if (MCPControllerRegister.hooks.length > 0) {
      for (const hook of MCPControllerRegister.hooks) {
        await hook.preProxy?.(ctx, req, res);
      }
    }
    let transport: SSEServerTransport;
    const existingTransport = self.transports[sessionId];
    if (existingTransport instanceof SSEServerTransport) {
      transport = existingTransport;
    } else {
      // https://modelcontextprotocol.io/docs/concepts/architecture#error-handling
      res.writeHead(400).end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: Session exists but uses a different transport protocol',
        },
        id: null,
      }));
      return;
    }
    if (transport) {
      try {
        await self.transports[sessionId].handlePostMessage(req, res);
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
    } else {
      res.writeHead(404).end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Bad Request: No transport found for sessionId',
        },
        id: null,
      }));
    }
  };
  sseProxyHandlerMap.set(self, handler);
  return handler;
}

function getStreamProxyHandler(self: MCPControllerRegister): StreamProxyHandler {
  let handler = streamProxyHandlerMap.get(self);
  if (handler) {
    return handler;
  }
  handler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    let mw = self.app.middleware.teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([ mw, self.globalMiddlewares ]);
    }
    const ctx = self.app.createContext(req, res) as unknown as Context;
    if (MCPControllerRegister.hooks.length > 0) {
      for (const hook of MCPControllerRegister.hooks) {
        await hook.preProxy?.(ctx, req, res);
      }
    }
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'session id not have and run in proxy',
        },
        id: null,
      }));
    } else {
      let transport: StreamableHTTPServerTransport;
      const existingTransport = self.streamTransports[sessionId];
      if (existingTransport instanceof StreamableHTTPServerTransport) {
        transport = existingTransport;
      } else {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: Session exists but uses a different transport protocol',
          },
          id: null,
        }));
        return;
      }
      if (transport) {
        self.scheduleStreamMcpServerCleanup(sessionId);
        try {
          await self.app.ctxStorage.run(ctx, async () => {
            await mw(ctx, async () => {
              await transport.handleRequest(ctx.req, ctx.res);
              await self.waitResponseClosed(ctx.res);
            });
          });
        } finally {
          self.scheduleStreamMcpServerCleanup(sessionId);
        }
      } else {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Bad Request: No transport found for sessionId',
          },
          id: null,
        }));
      }
    }
  };
  streamProxyHandlerMap.set(self, handler);
  return handler;
}


export const MCPProxyHook: MCPControllerHook = {
  async preSSEInitHandle(ctx, transport, self) {
    const id = transport.sessionId;
    // cluster proxy
    await self.app.mcpProxy.registerClient(id, process.pid);
    self.app.mcpProxy.setProxyHandler(MCPProtocols.SSE, getSseProxyHandler(self));
    ctx.res.once('close', () => {
      self.clearSseMcpServer(transport)
        .catch(error => self.app.logger.error('[mcp-proxy] clear SSE MCP server failed: %s', error.message));
      self.app.mcpProxy.unregisterClient(id)
        .catch(error => self.app.logger.error('[mcp-proxy] unregister SSE client failed: %s', error.message));
    });
  },
  async onStreamSessionInitialized(_ctx, transport, _server, self) {
    const sessionId = transport.sessionId!;
    self.streamTransports[sessionId] = transport;
    self.app.mcpProxy.setProxyHandler(MCPProtocols.STREAM, getStreamProxyHandler(self));
    await self.app.mcpProxy.registerClient(sessionId, process.pid);
    const closeFunc = transport.onclose;
    transport.onclose = async () => {
      const sid = transport.sessionId ?? sessionId;
      try {
        await closeFunc?.();
      } finally {
        if (sid) {
          self.clearStreamMcpServer(sid);
          await self.app.mcpProxy.unregisterClient(sid);
        }
      }
    };
  },
  async checkAndRunProxy(ctx, type, sessionId) {
    const detail = await ctx.app.mcpProxy.getClient(sessionId);
    if (!detail) {
      return false;
    }
    if (detail.pid !== process.pid) {
      await ctx.app.mcpProxy.proxyMessage(ctx, {
        detail,
        sessionId,
        type,
      });
      return true;
    }
    return false;
  },
};

export class MCPProxyApiClient extends APIClientBase {
  private _client: any;
  private logger: EggLogger;
  private proxyHandlerMap: { [P in ProxyAction]?: StreamableHTTPServerTransport['handleRequest']; } = {};
  private port: number;
  private app: Application;
  private isAgent: boolean;
  private server?: http.Server;
  private _closed: boolean;

  constructor(options: {
    logger: EggLogger;
    messenger: Messenger;
    app: Application;
    isAgent?: boolean;
  }) {
    super(Object.assign({}, options, { initMethod: '_init' }));
    this.logger = options.logger;
    this.port = 0;
    this.app = options.app;
    this.isAgent = !!options.isAgent;
    this._closed = false;
  }

  async _init() {
    if (!this.isAgent) {
      this.server = http.createServer(async (req, res) => {
        const type = req.headers['mcp-proxy-type'] as ProxyAction;
        await this.proxyHandlerMap[type]?.(req, res);
      });
      this.port = this.app.config.mcp?.proxyPort + (cluster.worker?.id ?? 0);
      await new Promise(resolve => this.server!.listen(this.port, () => {
        // const address = server.address()! as AddressInfo;
        // this.port = address.port;
        resolve(null);
      }));
    }
  }

  async close() {
    if (this._closed) {
      return;
    }
    this._closed = true;

    const server = this.server;
    this.server = undefined;
    try {
      if (server?.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close(err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
          server.closeAllConnections?.();
        });
      }
    } finally {
      await super.close();
    }
  }

  setProxyHandler(type: MCPProtocols, handler: StreamableHTTPServerTransport['handleRequest'] | SSEServerTransport['handlePostMessage']) {
    let action: ProxyAction;
    switch (type) {
      case MCPProtocols.SSE:
        action = 'MCP_SEE_PROXY';
        break;
      case MCPProtocols.STDIO:
        action = 'MCP_STDIO_PROXY';
        break;
      default:
        action = 'MCP_STREAM_PROXY';
        break;
    }
    this.proxyHandlerMap[action] = handler;
  }

  async registerClient(sessionId: string, pid: number): Promise<void> {
    await this._client.registerClient(sessionId, {
      pid,
      port: this.port,
    });
  }

  async unregisterClient(sessionId: string): Promise<void> {
    await this._client.unregisterClient(sessionId);
  }

  async getClient(sessionId: string): Promise<ClientDetail | undefined> {
    return this._client.getClient(sessionId);
  }

  async proxyMessage(ctx: Context, options: ProxyMessageOptions): Promise<void> {
    let body: string | unknown;
    const { detail, sessionId, type } = options;
    try {
      let encoding = 'utf-8';
      if (ctx.req.headers['content-type']) {
        const ct = contentType.parse(ctx.req.headers['content-type'] ?? '');
        if (ct.type !== 'application/json') {
          throw new Error(`Unsupported content-type: ${ct}`);
        }
        encoding = ct.parameters.charset;
      }

      // ctx.respond = false;

      body = await getRawBody(ctx.req, {
        limit: MAXIMUM_MESSAGE_SIZE,
        encoding,
      });
    } catch (error) {
      this.logger.error(error);
      ctx.res.writeHead(400).end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: `Bad Request: ${String(error)}`,
        },
        id: null,
      }));
      return;
    }

    try {
      // const socketPath = `${this.app.baseDir}/mcpServer${pid}.sock`;
      let action: ProxyAction;
      switch (type) {
        case 'SSE': {
          action = 'MCP_SEE_PROXY';
          const requestHeaders = buildProxyRequestHeaders(ctx.req.headers, action, sessionId);
          const resp = await fetch(`http://localhost:${detail.port}/mcp/message?sessionId=${sessionId}`, {
            // dispatcher: new Agent({
            //   connect: {
            //     socketPath,
            //   },
            // }),
            headers: requestHeaders,
            body: body as string,
            method: ctx.req.method,
          });
          const responseHeaders: Record<string, string> = {
            'mcp-proxy-arg': encodeURIComponent((body as Buffer).toString()),
          };
          for (const [ key, value ] of resp.headers.entries()) {
            if (IGNORE_HEADERS.includes(key)) {
              continue;
            }
            responseHeaders[key] = value;
          }
          ctx.set(responseHeaders);
          ctx.res.statusCode = resp.status;
          ctx.res.statusMessage = resp.statusText;
          const resData = await resp.text();
          ctx.body = resData;
          break;
        }
        case 'STDIO':
          action = 'MCP_STDIO_PROXY';
          ctx.res.writeHead(400).end(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32602,
              message: 'Bad Request: STDIO IS NOT IMPL',
            },
            id: null,
          }));
          break;
        default: {
          action = 'MCP_STREAM_PROXY';
          ctx.respond = false;
          const requestHeaders = buildProxyRequestHeaders(ctx.req.headers, action, sessionId);
          const dispatcher = new Agent({
            bodyTimeout: 10 * 60 * 1000,
            headersTimeout: 30 * 1000,
            keepAliveTimeout: 10 * 1000,
            keepAliveMaxTimeout: 30 * 1000,
          });
          try {
            const response = await fetch(`http://localhost:${detail.port}`, {
              dispatcher,
              headers: requestHeaders,
              method: ctx.req.method,
              ...(ctx.req.method !== 'GET' ? {
                body: body as string,
              } : {}),
            });
            const responseHeaders: Record<string, string> = {
              'mcp-proxy-arg': encodeURIComponent((body as Buffer).toString()),
            };
            for (const [ key, value ] of response.headers.entries()) {
              if (IGNORE_HEADERS.includes(key)) {
                continue;
              }
              responseHeaders[key] = value;
            }
            ctx.set(responseHeaders);
            ctx.res.statusCode = response.status;
            const readable = Readable.fromWeb(response.body!);
            readable.on('error', err => {
              this.logger.error('[mcp-proxy] stream proxy error: %s', err.message);
              if (!ctx.res.writableEnded) {
                ctx.res.end();
              }
              dispatcher.close();
            });
            readable.on('end', () => {
              dispatcher.close();
            });
            ctx.res.on('close', () => {
              dispatcher.close();
            });
            readable.pipe(ctx.res);
          } catch (err) {
            dispatcher.close();
            this.logger.error('[mcp-proxy] stream proxy fetch error: %s', err.message);
            if (!ctx.res.headersSent) {
              ctx.res.writeHead(502, { 'content-type': 'application/json' });
            }
            if (!ctx.res.writableEnded) {
              ctx.res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: `Proxy error: ${err.message}`,
                },
                id: null,
              }));
            }
          }
          break;
        }
      }
    } catch (error) {
      this.logger.error(error);
      ctx.res.writeHead(500, { 'content-type': 'application/json' })
        .end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
          },
          id: null,
        }));
      return;
    }
  }

  handleSseStream(ctx: Context, stream: ReadableStream<any>) {
    const processStream = async () => {
      try {
        const reader = stream
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          .pipeThrough(new TextDecoderStream())
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          .pipeThrough(new EventSourceParserStream())
          .getReader();

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value: event, done } = await reader.read();
          if (done) {
            break;
          }

          let eventData = 'event: message\n';

          if ((event as any)!.id) {
            eventData += `id: ${(event as any)!.id}\n`;
          }
          eventData += `data: ${JSON.stringify((event as any)!.data)}\n\n`;

          ctx.res.write(eventData);
        }
        ctx.res.write('event: terminate');
      } catch (error) {
        this.logger.error('[mcp-proxy] sse stream error: %s', error);
        if (!ctx.res.writableEnded) {
          ctx.res.statusCode = 500;
          ctx.res.end();
        }
      }
    };
    processStream();
  }

  get delegates() {
    return {
      registerClient: 'invoke',
      unregisterClient: 'invoke',
      getClient: 'invoke',
    };
  }

  get DataClient() {
    return MCPProxyDataClient;
  }

  get clusterOptions() {
    return {
      name: 'MCPProxy',
    };
  }
}
