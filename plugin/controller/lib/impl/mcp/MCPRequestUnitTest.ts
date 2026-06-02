import assert from 'node:assert';
import { Client, type ClientOptions } from '@modelcontextprotocol/sdk/client/index.js';
import {
  SSEClientTransport,
  type SSEClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/sse.js';
import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  CallToolRequest,
  GetPromptRequest,
  Implementation,
  ListPromptsRequest,
  ListResourceTemplatesRequest,
  ListResourcesRequest,
  ListToolsRequest,
  ReadResourceRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { Application } from 'egg';
import { MCPControllerRegister } from './MCPControllerRegister';

export type MCPTransportProtocol = 'streamable' | 'stateless' | 'sse';

export interface MCPRequestMockApplication extends Application {
  httpRequest(): {
    get(url: string): { url: string };
    post(url: string): { url: string };
  };
}

export interface MCPRequestUnitTestOptions {
  app: MCPRequestMockApplication;
  serverName?: string;
}

export interface MCPConnectOptions {
  clientInfo?: Implementation;
  clientOptions?: ClientOptions;
  streamableTransportOptions?: StreamableHTTPClientTransportOptions;
  sseTransportOptions?: SSEClientTransportOptions;
}

type RequestOptions = Parameters<Client['request']>[2];
type HeadersRecord = Record<string, string>;

export class MCPTestClient {
  readonly client: Client;
  readonly transport: StreamableHTTPClientTransport | SSEClientTransport;
  readonly protocol: MCPTransportProtocol;

  constructor(
    client: Client,
    transport: StreamableHTTPClientTransport | SSEClientTransport,
    protocol: MCPTransportProtocol,
  ) {
    this.client = client;
    this.transport = transport;
    this.protocol = protocol;
  }

  listTools(params?: ListToolsRequest['params'], options?: RequestOptions) {
    return this.client.listTools(params, options);
  }

  listResources(params?: ListResourcesRequest['params'], options?: RequestOptions) {
    return this.client.listResources(params, options);
  }

  listResourceTemplates(params?: ListResourceTemplatesRequest['params'], options?: RequestOptions) {
    return this.client.listResourceTemplates(params, options);
  }

  listPrompts(params?: ListPromptsRequest['params'], options?: RequestOptions) {
    return this.client.listPrompts(params, options);
  }

  callTool(name: string, args?: Record<string, unknown>, options?: RequestOptions): ReturnType<Client['callTool']>;
  callTool(params: CallToolRequest['params'], options?: RequestOptions): ReturnType<Client['callTool']>;
  callTool(
    nameOrParams: string | CallToolRequest['params'],
    argsOrOptions?: Record<string, unknown> | RequestOptions,
    options?: RequestOptions,
  ) {
    const params = typeof nameOrParams === 'string' ?
      { name: nameOrParams, arguments: argsOrOptions as Record<string, unknown> | undefined ?? {} } :
      nameOrParams;
    const requestOptions = typeof nameOrParams === 'string' ? options : argsOrOptions as RequestOptions | undefined;
    return this.client.callTool(params, undefined, requestOptions);
  }

  readResource(uri: string, options?: RequestOptions): ReturnType<Client['readResource']>;
  readResource(params: ReadResourceRequest['params'], options?: RequestOptions): ReturnType<Client['readResource']>;
  readResource(uriOrParams: string | ReadResourceRequest['params'], options?: RequestOptions) {
    const params = typeof uriOrParams === 'string' ? { uri: uriOrParams } : uriOrParams;
    return this.client.readResource(params, options);
  }

  getPrompt(name: string, args?: Record<string, string>, options?: RequestOptions): ReturnType<Client['getPrompt']>;
  getPrompt(params: GetPromptRequest['params'], options?: RequestOptions): ReturnType<Client['getPrompt']>;
  getPrompt(
    nameOrParams: string | GetPromptRequest['params'],
    argsOrOptions?: Record<string, string> | RequestOptions,
    options?: RequestOptions,
  ) {
    const params = typeof nameOrParams === 'string' ?
      { name: nameOrParams, arguments: argsOrOptions as Record<string, string> | undefined ?? {} } :
      nameOrParams;
    const requestOptions = typeof nameOrParams === 'string' ? options : argsOrOptions as RequestOptions | undefined;
    return this.client.getPrompt(params, requestOptions);
  }

  request(...args: Parameters<Client['request']>) {
    return this.client.request(...args);
  }

  setNotificationHandler(...args: Parameters<Client['setNotificationHandler']>) {
    this.client.setNotificationHandler(...args);
    return this;
  }

  async close() {
    if (this.transport instanceof StreamableHTTPClientTransport) {
      await this.transport.terminateSession();
    }
    await this.client.close();
  }
}

export default class MCPRequestUnitTest {
  readonly #app: MCPRequestMockApplication;
  #protocol: MCPTransportProtocol = 'streamable';
  #serverName?: string;
  #headers: HeadersRecord = {};
  #authToken = 'akita';
  #clientInfo: Implementation = {
    name: 'egg-mcp-test-client',
    version: '1.0.0',
  };
  #clientOptions?: ClientOptions;
  #streamableTransportOptions?: StreamableHTTPClientTransportOptions;
  #sseTransportOptions?: SSEClientTransportOptions;

  constructor(options: MCPRequestUnitTestOptions) {
    assert(options.app, '初始化依赖 app');
    this.#app = options.app;
    this.#serverName = options.serverName;
  }

  streamable(options?: StreamableHTTPClientTransportOptions) {
    this.#protocol = 'streamable';
    this.#streamableTransportOptions = options;
    return this;
  }

  stateless(options?: StreamableHTTPClientTransportOptions) {
    this.#protocol = 'stateless';
    this.#streamableTransportOptions = options;
    return this;
  }

  sse(options?: SSEClientTransportOptions) {
    this.#protocol = 'sse';
    this.#sseTransportOptions = options;
    return this;
  }

  authToken(token: string) {
    this.#authToken = token;
    return this;
  }

  clientInfo(info: Partial<Implementation>) {
    this.#clientInfo = {
      ...this.#clientInfo,
      ...info,
    };
    return this;
  }

  clientOptions(options: ClientOptions) {
    this.#clientOptions = options;
    return this;
  }

  set(name: string, value: string | number | boolean) {
    this.#headers[name] = String(value);
    return this;
  }

  headers(headers: Record<string, string | number | boolean | undefined>) {
    for (const [ key, value ] of Object.entries(headers)) {
      if (value !== undefined) {
        this.set(key, value);
      }
    }
    return this;
  }

  async connect(options?: MCPConnectOptions) {
    const client = new Client(
      options?.clientInfo ?? this.#clientInfo,
      options?.clientOptions ?? this.#clientOptions,
    );
    const transport = this.#createTransport(options);
    await client.connect(transport);
    return new MCPTestClient(client, transport, this.#protocol);
  }

  listTools(params?: ListToolsRequest['params'], options?: RequestOptions) {
    return this.#withClient(client => client.listTools(params, options));
  }

  listResources(params?: ListResourcesRequest['params'], options?: RequestOptions) {
    return this.#withClient(client => client.listResources(params, options));
  }

  listResourceTemplates(params?: ListResourceTemplatesRequest['params'], options?: RequestOptions) {
    return this.#withClient(client => client.listResourceTemplates(params, options));
  }

  listPrompts(params?: ListPromptsRequest['params'], options?: RequestOptions) {
    return this.#withClient(client => client.listPrompts(params, options));
  }

  callTool(name: string, args?: Record<string, unknown>, options?: RequestOptions): ReturnType<Client['callTool']>;
  callTool(params: CallToolRequest['params'], options?: RequestOptions): ReturnType<Client['callTool']>;
  callTool(
    nameOrParams: string | CallToolRequest['params'],
    argsOrOptions?: Record<string, unknown> | RequestOptions,
    options?: RequestOptions,
  ) {
    return this.#withClient(client => client.callTool(nameOrParams as any, argsOrOptions as any, options));
  }

  readResource(uri: string, options?: RequestOptions): ReturnType<Client['readResource']>;
  readResource(params: ReadResourceRequest['params'], options?: RequestOptions): ReturnType<Client['readResource']>;
  readResource(uriOrParams: string | ReadResourceRequest['params'], options?: RequestOptions) {
    return this.#withClient(client => client.readResource(uriOrParams as any, options));
  }

  getPrompt(name: string, args?: Record<string, string>, options?: RequestOptions): ReturnType<Client['getPrompt']>;
  getPrompt(params: GetPromptRequest['params'], options?: RequestOptions): ReturnType<Client['getPrompt']>;
  getPrompt(
    nameOrParams: string | GetPromptRequest['params'],
    argsOrOptions?: Record<string, string> | RequestOptions,
    options?: RequestOptions,
  ) {
    return this.#withClient(client => client.getPrompt(nameOrParams as any, argsOrOptions as any, options));
  }

  async #withClient<T>(callback: (client: MCPTestClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      return await callback(client);
    } finally {
      await client.close();
    }
  }

  #createTransport(options?: MCPConnectOptions) {
    const url = new URL(this.#url);
    if (this.#protocol === 'sse') {
      const transportOptions = options?.sseTransportOptions ?? this.#sseTransportOptions ?? {};
      return new SSEClientTransport(url, {
        authProvider: this.#createAuthProvider(),
        ...transportOptions,
        requestInit: this.#mergeRequestInit(transportOptions.requestInit),
      });
    }

    const transportOptions = options?.streamableTransportOptions ?? this.#streamableTransportOptions ?? {};
    return new StreamableHTTPClientTransport(url, {
      authProvider: this.#createAuthProvider(),
      ...transportOptions,
      requestInit: this.#mergeRequestInit(transportOptions.requestInit),
    });
  }

  #createAuthProvider(): NonNullable<StreamableHTTPClientTransportOptions['authProvider']> {
    return {
      get redirectUrl() { return 'http://localhost/callback'; },
      get clientMetadata() { return { redirect_uris: [ 'http://localhost/callback' ] }; },
      clientInformation: () => ({ client_id: 'test-client-id', client_secret: 'test-client-secret' }),
      tokens: () => {
        return {
          access_token: Buffer.from(this.#authToken).toString('base64'),
          token_type: 'Bearer',
        };
      },
      saveTokens: () => undefined,
      redirectToAuthorization: () => undefined,
      saveCodeVerifier: () => undefined,
      codeVerifier: () => '',
    };
  }

  #mergeRequestInit(requestInit?: RequestInit): RequestInit {
    return {
      ...requestInit,
      headers: {
        ...this.#normalizeHeaders(requestInit?.headers),
        ...this.#headers,
      },
    };
  }

  #normalizeHeaders(headers?: HeadersInit): HeadersRecord {
    if (!headers) return {};
    if (Array.isArray(headers)) {
      return Object.fromEntries(headers.map(([ key, value ]) => [ key, String(value) ]));
    }
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
      return Object.fromEntries(headers.entries());
    }
    return Object.fromEntries(Object.entries(headers).map(([ key, value ]) => [ key, String(value) ]));
  }

  get #url() {
    const path = this.#path;
    const method = this.#protocol === 'sse' ? 'get' : 'post';
    return this.#app.httpRequest()[method](path).url;
  }

  get #path() {
    const mcpConfig = MCPControllerRegister.instance?.mcpConfig;
    if (mcpConfig) {
      if (this.#protocol === 'sse') {
        return mcpConfig.getSseInitPath(this.#serverName);
      }
      if (this.#protocol === 'stateless') {
        return mcpConfig.getStatelessStreamPath(this.#serverName);
      }
      return mcpConfig.getStreamPath(this.#serverName);
    }

    const config = this.#app.config.mcp ?? {};
    if (this.#serverName) {
      const multipleServerConfig = config.multipleServer?.[this.#serverName] ?? {};
      if (this.#protocol === 'sse') {
        return multipleServerConfig.sseInitPath ?? `/mcp/${this.#serverName}/sse`;
      }
      if (this.#protocol === 'stateless') {
        return multipleServerConfig.statelessStreamPath ?? `/mcp/${this.#serverName}/stateless/stream`;
      }
      return multipleServerConfig.streamPath ?? `/mcp/${this.#serverName}/stream`;
    }

    if (this.#protocol === 'sse') {
      return config.sseInitPath ?? '/mcp/sse';
    }
    if (this.#protocol === 'stateless') {
      return config.statelessStreamPath ?? '/mcp/stateless/stream';
    }
    return config.streamPath ?? '/mcp/stream';
  }
}
