import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { WebSocket } from 'ws';
import type { WebSocketContext } from '@eggjs/tegg';

export class WebSocketContextImpl implements WebSocketContext<WebSocket> {
  readonly socket: WebSocket;
  readonly request: IncomingMessage;
  readonly path: string;
  readonly host: string;
  readonly params: Record<string, string>;
  readonly query: Record<string, string | undefined>;
  readonly queries: Record<string, string[]>;
  readonly headers: IncomingHttpHeaders;

  constructor(options: {
    socket: WebSocket;
    request: IncomingMessage;
    url: URL;
    params: Record<string, string>;
  }) {
    this.socket = options.socket;
    this.request = options.request;
    this.path = options.url.pathname;
    this.host = options.url.host;
    this.params = options.params;
    this.headers = options.request.headers;
    this.query = {};
    this.queries = {};

    for (const key of options.url.searchParams.keys()) {
      this.query[key] = options.url.searchParams.get(key) ?? undefined;
      this.queries[key] = options.url.searchParams.getAll(key);
    }
  }
}
