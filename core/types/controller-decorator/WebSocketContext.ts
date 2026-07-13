import type { Context } from 'egg';

export interface WebSocketLike {
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
  send(data: any, cb?: (err?: Error) => void): void;
  close(code?: number, reason?: string | Buffer): void;
  readonly readyState?: number;
}

export interface WebSocketContext<Socket = WebSocketLike> extends Context {
  readonly webSocket: Socket;
}
