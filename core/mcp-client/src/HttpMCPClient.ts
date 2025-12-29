import { Client, ClientOptions } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport, SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { fetch } from 'urllib';
import { mergeHeaders } from './HeaderUtil';
import type { Logger } from '@eggjs/tegg';
import { loadMcpTools } from '@langchain/mcp-adapters';
export interface BaseHttpClientOptions extends ClientOptions {
  logger: Logger;
  fetch?: typeof fetch;
  url: string;
  transportType: 'SSE' | 'STREAMABLE_HTTP';
}
export interface HttpSSEClientOptions extends BaseHttpClientOptions {
  transportOptions?: SSEClientTransportOptions;
  requestOptions?: RequestOptions;
  transportType: 'SSE';
}
export interface HttpStreamableHTTPClientOptions extends BaseHttpClientOptions {
  transportOptions?: StreamableHTTPClientTransportOptions;
  requestOptions?: RequestOptions;
  transportType: 'STREAMABLE_HTTP';
}
export type HttpClientOptions = HttpSSEClientOptions | HttpStreamableHTTPClientOptions;

export class HttpMCPClient extends Client {
  protected logger: Logger;
  options: HttpClientOptions;
  #transport: SSEClientTransport | StreamableHTTPClientTransport;
  #fetch: typeof fetch;
  url: string;
  clientInfo: Implementation;
  constructor(clientInfo: Implementation, options: HttpClientOptions) {
    super(clientInfo, options);
    this.options = options;
    this.#fetch = options.fetch ?? fetch;
    this.logger = options.logger;
    this.url = options.url;
    this.clientInfo = clientInfo;
  }
  async #buildSSESTransport() {
    const self = this;
    this.logger.info('subscribe config %j use vip: %s', this.url);
    const url = new URL(this.url);
    const requestInit: { headers: Record<string, string> } = {
      headers: {},
    };
    const fetchRequestInit = {
      get headers() {
        return mergeHeaders(
          self.options.transportOptions?.requestInit?.headers,
          requestInit.headers as HeadersInit,
        );
      },
    };
    const transportRequestInit: SSEClientTransportOptions = {
      authProvider: this.options.transportOptions?.authProvider,
      fetch: this.#fetch as any,
      eventSourceInit: {
        async fetch(url, requestInit) {
          const headers = mergeHeaders(
            requestInit.headers,
            fetchRequestInit.headers,
          );
          requestInit.headers = headers as any;
          return await self.#fetch(url, requestInit);
        },
      },
      get requestInit() {
        return {
          ...self.options.transportOptions?.requestInit,
          get headers() {
            return fetchRequestInit.headers;
          },
        };
      },
    };
    this.#transport = new SSEClientTransport(url, transportRequestInit);
  }
  async #buildStreamableHTTPTransport() {
    const self = this;
    this.logger.info('subscribe config %j use vip: %s', this.url);
    const url = new URL(this.url);
    const requestInit: { headers: Record<string, string> } = {
      headers: {},
    };
    const fetchRequestInit = {
      get headers() {
        return mergeHeaders(
          self.options.transportOptions?.requestInit?.headers,
          requestInit.headers as HeadersInit,
        );
      },
    };
    const transportRequestInit: StreamableHTTPClientTransportOptions = {
      authProvider: this.options.transportOptions?.authProvider,
      fetch: this.#fetch as any,
      get requestInit() {
        return {
          ...self.options.transportOptions?.requestInit,
          get headers() {
            return fetchRequestInit.headers;
          },
        };
      },
    };
    this.#transport = new StreamableHTTPClientTransport(url, transportRequestInit);
  }
  async init() {
    if (this.options.transportType === 'SSE') {
      await this.#buildSSESTransport();
    } else {
      await this.#buildStreamableHTTPTransport();
    }
    await this.connect(this.#transport, this.options.requestOptions);
  }
  async getLangChainTool() {
    return await loadMcpTools(this.clientInfo.name, this as any, {
      throwOnLoadError: true,
      prefixToolNameWithServerName: false,
      additionalToolNamePrefix: '',
    });
  }
}
