import type { Context } from 'egg';
import type { WebSocket } from 'ws';
import type { WebSocketContext } from '@eggjs/tegg';

export function extendWebSocketContext(
  ctx: Context,
  webSocket: WebSocket,
  params: Record<string, string>,
): WebSocketContext<WebSocket> {
  Object.defineProperty(ctx, 'webSocket', {
    configurable: true,
    enumerable: false,
    value: webSocket,
  });
  ctx.params = params;
  return ctx as WebSocketContext<WebSocket>;
}
