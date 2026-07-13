import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

export interface WebSocketUpgradeEvent extends Event {
  request: IncomingMessage;
  socket: Duplex;
  head: Buffer;
}
