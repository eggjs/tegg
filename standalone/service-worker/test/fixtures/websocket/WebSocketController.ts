import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { PassThrough, pipeline, type Readable } from 'node:stream';
import type { RawData, WebSocket } from 'ws';
import {
  Context,
  Headers,
  Param,
  Query,
  Queries,
  Request,
  WebSocketClose,
  WebSocketCloseCode,
  WebSocketCloseReason,
  WebSocketContext,
  WebSocketController,
  WebSocketData,
  WebSocketError,
  WebSocketFetchClose,
  WebSocketFetchController,
  WebSocketFetchMethod,
  WebSocketFetchOnClose,
  WebSocketFetchOnConnection,
  WebSocketFetchOnError,
  WebSocketFetchOnOpen,
  WebSocketMethod,
  WebSocketSocket,
  WebSocketStream,
} from '@eggjs/tegg';

interface WebSocketFetchRequest {
  content: string;
  close?: boolean;
  error?: boolean;
  delayMs?: number;
  holdOpen?: boolean;
  observeClose?: boolean;
  pipeline?: boolean;
}

export const fetchCloseEvents: string[] = [];
export const fetchStreamCloseEvents: string[] = [];

@WebSocketController({
  path: '/ws',
})
export class StandaloneWebSocketController {
  @WebSocketMethod({
    path: '/echo/:id',
  })
  async echo(
    @WebSocketSocket() socket: WebSocket,
    @Param() id: string,
    @Query() name: string,
    @Queries({ name: 'tag' }) tags: string[],
    @Headers() headers: IncomingHttpHeaders,
    @Request() request: IncomingMessage,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    socket.send(JSON.stringify({
      type: 'ready',
      id,
      name,
      tags,
      header: headers['x-client-id'],
      url: request.url,
      path: ctx.path,
    }));

    socket.on('message', data => {
      socket.send(JSON.stringify({
        type: 'echo',
        data: data.toString(),
      }));
    });
  }

  @WebSocketMethod({
    path: '/stream/:id',
  })
  stream(
    @WebSocketStream() input: Readable,
    @Param() id: string,
    @Query() name: string,
  ) {
    const output = new PassThrough();
    output.write(JSON.stringify({
      type: 'ready',
      id,
      name,
    }));

    input.on('data', data => {
      output.write(JSON.stringify({
        type: 'stream',
        data: data.toString(),
      }));
    });
    input.on('end', () => output.end());
    input.on('error', error => output.destroy(error));

    return output;
  }
}

@WebSocketFetchController({
  path: '/ws-fetch/:id',
})
export class StandaloneWebSocketFetchController {
  @WebSocketFetchOnConnection()
  onConnection(
    @Headers() headers: IncomingHttpHeaders,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    ctx.socket.send(JSON.stringify({
      type: 'connection',
      header: headers['x-client-id'],
      path: ctx.path,
    }));
  }

  @WebSocketFetchOnOpen()
  onOpen(
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    ctx.socket.send(JSON.stringify({
      type: 'open',
      path: ctx.path,
    }));
  }

  @WebSocketFetchMethod()
  onData(
    @WebSocketData() data: RawData,
    @WebSocketClose() close: WebSocketFetchClose,
    @Param() id: string,
    @Query() name: string,
    @Queries({ name: 'tag' }) tags: string[],
    @Headers() headers: IncomingHttpHeaders,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    const body = JSON.parse(data.toString()) as WebSocketFetchRequest;
    const source = new PassThrough();
    const output = body.pipeline ? new PassThrough() : source;
    if (body.pipeline) {
      pipeline(source, output, () => {
        // WebSocketFetch observes errors from the returned output stream.
      });
    }
    source.write(JSON.stringify({
      type: 'data',
      phase: 1,
      id,
      name,
      tags,
      header: headers['x-client-id'],
      path: ctx.path,
      content: body.content,
    }));

    if (body.observeClose) {
      output.once('close', () => {
        fetchStreamCloseEvents.push(`${id}:${body.content}:${output.readableEnded}:${output.destroyed}`);
      });
      if (body.pipeline) {
        source.once('close', () => {
          fetchStreamCloseEvents.push(`source:${id}:${body.content}:${source.readableEnded}:${source.destroyed}`);
        });
      }
    }

    if (body.holdOpen) {
      return output;
    }

    setTimeout(() => {
      if (source.destroyed) {
        return;
      }
      if (body.error) {
        source.destroy(new Error(`fetch error: ${body.content}`));
        return;
      }
      source.write(JSON.stringify({
        type: 'data',
        phase: 2,
        id,
        content: body.content,
      }));
      source.end();
    }, body.delayMs ?? 10);

    if (body.close) {
      output.once('end', () => setImmediate(() => close(1000, 'server done')));
    }
    return output;
  }

  @WebSocketFetchOnError()
  onError(
    @WebSocketError() error: Error,
    @Headers() headers: IncomingHttpHeaders,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    ctx.socket.send(JSON.stringify({
      type: 'error',
      message: error.message,
      header: headers['x-client-id'],
      path: ctx.path,
    }));
  }

  @WebSocketFetchOnClose()
  onClose(
    @WebSocketCloseCode() code: number,
    @WebSocketCloseReason() reason: Buffer,
    @Param() id: string,
  ) {
    fetchCloseEvents.push(`${id}:${code}:${reason.toString()}`);
  }
}
