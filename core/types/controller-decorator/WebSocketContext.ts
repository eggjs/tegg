import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

export interface WebSocketLike {
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  send(data: any, cb?: (err?: Error) => void): void;
  close(code?: number, reason?: string | Buffer): void;
  readonly readyState?: number;
}

export interface WebSocketContext<Socket = WebSocketLike> {
  readonly socket: Socket;
  readonly request: IncomingMessage;
  readonly path: string;
  readonly host: string;
  readonly params: Record<string, string>;
  readonly query: Record<string, string | undefined>;
  readonly queries: Record<string, string[]>;
  readonly headers: IncomingHttpHeaders;
}
