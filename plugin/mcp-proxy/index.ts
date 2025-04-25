import { APIClientBase } from 'cluster-client';
import { MCPProxyDataClient } from './lib/MCPProxyDataClient';
import { Application, Context, EggLogger, Messenger } from 'egg';
import getRawBody from 'raw-body';
import contentType from 'content-type';
import { fetch, Agent } from 'undici';
import http from 'http';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import { Readable } from 'node:stream';

const MAXIMUM_MESSAGE_SIZE = '4mb';

export interface MCPProxyPayload {
  sessionId: string;
  message: unknown;
}

type ProxyAction = 'MCP_STDIO_PROXY' | 'MCP_SEE_PROXY' | 'MCP_STREAM_PROXY';

type MCPProtocols = 'STDIO' | 'SSE' | 'STREAM';

export interface ProxyMessageOptions {
  pid: number;
  sessionId: string;
  type: MCPProtocols;
}

export class MCPProxyApiClient extends APIClientBase {
  private _client: any;
  private logger: EggLogger;
  private proxyHandlerMap: { [P in ProxyAction]?: StreamableHTTPServerTransport['handleRequest']; } = {};
  private app: Application;

  constructor(options: {
    logger: EggLogger;
    messenger: Messenger;
    app: Application;
  }) {
    super(Object.assign({}, options, { initMethod: '_init' }));
    this.logger = options.logger;
    this.app = options.app;
  }

  async _init() {
    const socketPath = `${this.app.baseDir}/mcpServer${process.pid}.sock`;
    const server = http.createServer(async (req, res) => {
      const type = req.headers['mcp-proxy-type'] as ProxyAction;
      await this.proxyHandlerMap[type]?.(req, res);
    });
    await new Promise(resolve => server.listen(socketPath, () => { resolve(null); }));
  }

  setProxyHandler(type: MCPProtocols, handler: StreamableHTTPServerTransport['handleRequest'] | SSEServerTransport['handlePostMessage']) {
    let action: ProxyAction;
    switch (type) {
      case 'SSE':
        action = 'MCP_SEE_PROXY';
        break;
      case 'STDIO':
        action = 'MCP_STDIO_PROXY';
        break;
      default:
        action = 'MCP_STREAM_PROXY';
        break;
    }
    this.proxyHandlerMap[action] = handler;
  }

  async registerClient(sessionId: string, pid: number): Promise<void> {
    await this._client.registerClient(sessionId, pid);
  }

  async unregisterClient(sessionId: string): Promise<void> {
    await this._client.unregisterClient(sessionId);
  }

  async getClient(sessionId: string): Promise<number | undefined> {
    return this._client.getClient(sessionId);
  }

  async proxyMessage(ctx: Context, options: ProxyMessageOptions): Promise<void> {
    let body: string | unknown;
    const { pid, sessionId, type } = options;
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
      ctx.res.writeHead(400).end(String(error));
      return;
    }

    try {
      const socketPath = `${this.app.baseDir}/mcpServer${pid}.sock`;
      let action: ProxyAction;
      switch (type) {
        case 'SSE': {
          action = 'MCP_SEE_PROXY';
          ctx.req.headers['mcp-proxy-type'] = action;
          ctx.req.headers['mcp-proxy-sessionid'] = sessionId;
          const resp = await fetch(`http://localhost/mcp/message?sessionId=${sessionId}`, {
            dispatcher: new Agent({
              connect: {
                socketPath,
              },
            }),
            headers: ctx.req.headers as unknown as Record<string, string>,
            body: body as string,
            method: ctx.req.method,
          });
          const headers: Record<string, string> = {};
          for (const [ key, value ] of resp.headers.entries()) {
            headers[key] = value;
          }
          delete headers['transfer-encoding'];
          ctx.set(headers);
          ctx.res.statusCode = resp.status;
          ctx.res.statusMessage = resp.statusText;
          const resData = await resp.text();
          ctx.body = resData;
          break;
        }
        case 'STDIO':
          action = 'MCP_STDIO_PROXY';
          ctx.req.headers['mcp-proxy-type'] = action;
          ctx.req.headers['mcp-proxy-sessionid'] = sessionId;
          ctx.res.writeHead(400).end('STDIO IS NOT IMPL');
          break;
        default: {
          action = 'MCP_STREAM_PROXY';
          ctx.respond = false;
          ctx.set({
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'transfer-encoding': 'chunked',
          });
          ctx.req.headers['mcp-proxy-type'] = action;
          ctx.req.headers['mcp-proxy-sessionid'] = sessionId;
          const response = await fetch('http://localhost/mcp/stream', {
            dispatcher: new Agent({
              connect: {
                socketPath,
              },
            }),
            headers: ctx.req.headers as unknown as Record<string, string>,
            method: ctx.req.method,
            ...(ctx.req.method !== 'GET' ? {
              body: body as string,
            } : {}),
          });
          const headers: Record<string, string> = {};
          for (const [ key, value ] of response.headers.entries()) {
            headers[key] = value;
          }
          delete headers['transfer-encoding'];
          ctx.set(headers);
          ctx.res.statusCode = response.status;
          Readable.fromWeb(response.body!).pipe(ctx.res);
          break;
        }
      }
    } catch (error) {
      this.logger.error(error);
      // ctx.res.writeHead(400).end(`Invalid message: ${body}`);
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

          if (event!.id) {
            eventData += `id: ${event!.id}\n`;
          }
          eventData += `data: ${JSON.stringify(event!.data)}\n\n`;

          ctx.res.write(eventData);
        }
        ctx.res.write('event: terminate');
      } catch (error) {
        ctx.res.statusCode = 500;
        ctx.res.write(`see stream error ${error}`);
        ctx.res.end();
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
