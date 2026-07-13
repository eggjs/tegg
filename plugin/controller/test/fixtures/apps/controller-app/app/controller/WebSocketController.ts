import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { PassThrough, pipeline, type Readable } from 'node:stream';
import type { Context as EggContext } from 'egg';
import type { RawData, WebSocket } from 'ws';
import {
  Context,
  HTTPHeaders,
  HTTPParam,
  HTTPQueries,
  HTTPQuery,
  Host,
  Inject,
  Middleware,
  Request,
  WebSocketContext,
  WebSocketController,
  WebSocketClose,
  WebSocketCloseCode,
  WebSocketCloseReason,
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
import AppService from '../../modules/multi-module-service/AppService';
import { webSocketFetchStreamCloseEvents } from './WebSocketTestState';

interface WebSocketFetchRequest {
  content: string;
  close?: boolean;
  error?: boolean;
  delayMs?: number;
  holdOpen?: boolean;
  observeClose?: boolean;
  pipeline?: boolean;
}

async function webSocketShortCircuit(ctx: EggContext) {
  const webSocketCtx = ctx as WebSocketContext<WebSocket>;
  webSocketCtx.webSocket.send(JSON.stringify({
    type: 'middleware',
    path: ctx.path,
  }));
}

@WebSocketController({
  path: '/ws',
})
export class AppWebSocketController {
  @Inject()
  appService: AppService;

  @WebSocketMethod({
    path: '/echo/:id',
  })
  async echo(
    @WebSocketSocket() socket: WebSocket,
    @HTTPParam() id: string,
    @HTTPQuery() name: string,
    @HTTPQueries({ name: 'tag' }) tags: string[],
    @HTTPHeaders() headers: IncomingHttpHeaders,
    @Request() request: IncomingMessage,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    await this.appService.save({
      name: id,
      desc: `ws:${name}`,
    });
    const app = await this.appService.findApp(id);

    socket.send(JSON.stringify({
      type: 'ready',
      id,
      name,
      tags,
      app,
      header: headers['x-client-id'],
      url: request.url,
      path: ctx.path,
      sameSocket: ctx.webSocket === socket,
      sameRequest: ctx.req === request,
      pid: process.pid,
    }));

    socket.on('message', data => {
      socket.send(JSON.stringify({
        type: 'echo',
        data: data.toString(),
        pid: process.pid,
      }));
    });
  }

  @WebSocketMethod({
    path: '/stream/:id',
  })
  async stream(
    @WebSocketStream() input: Readable,
    @HTTPParam() id: string,
    @HTTPQuery() name: string,
  ) {
    const output = new PassThrough();
    output.write(JSON.stringify({
      type: 'ready',
      id,
      name,
      pid: process.pid,
    }));

    input.on('data', data => {
      output.write(JSON.stringify({
        type: 'stream',
        data: data.toString(),
        pid: process.pid,
      }));
    });
    input.on('end', () => output.end());
    input.on('error', error => output.destroy(error));

    return output;
  }

  @Host('proxy.example.com')
  @WebSocketMethod({
    path: '/proxy',
  })
  proxy(@Context() ctx: WebSocketContext<WebSocket>) {
    ctx.webSocket.send(JSON.stringify({
      type: 'proxy',
      host: ctx.host,
      protocol: ctx.protocol,
    }));
  }

  @WebSocketMethod({
    path: '/optional/:id?',
  })
  optional(
    @HTTPParam() id: string | undefined,
    @WebSocketSocket() socket: WebSocket,
  ) {
    socket.send(JSON.stringify({
      type: 'optional',
      id: id ?? null,
    }));
  }

  @Middleware(webSocketShortCircuit)
  @WebSocketMethod({
    path: '/middleware-short-circuit',
  })
  middlewareShortCircuit() {
    throw new Error('middleware should not invoke this method');
  }

  @WebSocketMethod({
    path: '/timeout',
    timeout: 20,
  })
  async timeout() {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

@WebSocketFetchController({
  path: '/ws-fetch/:id',
})
export class AppWebSocketFetchController {
  @Inject()
  appService: AppService;

  @WebSocketFetchOnConnection()
  onConnection(
    @HTTPParam() id: string,
    @HTTPHeaders() headers: IncomingHttpHeaders,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    if (id === 'connection-error') {
      throw new Error('fetch connection error');
    }
    ctx.webSocket.send(JSON.stringify({
      type: 'connection',
      header: headers['x-client-id'],
      path: ctx.path,
      pid: process.pid,
    }));
  }

  @WebSocketFetchOnOpen()
  onOpen(
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    ctx.webSocket.send(JSON.stringify({
      type: 'open',
      path: ctx.path,
      pid: process.pid,
    }));
  }

  @WebSocketFetchMethod()
  onData(
    @WebSocketData() data: RawData,
    @WebSocketClose() close: WebSocketFetchClose,
    @HTTPParam() id: string,
    @HTTPQuery() name: string,
    @HTTPQueries({ name: 'tag' }) tags: string[],
    @HTTPHeaders() headers: IncomingHttpHeaders,
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
      pid: process.pid,
    }));

    if (body.observeClose) {
      output.once('close', () => {
        webSocketFetchStreamCloseEvents.set(
          `ws-fetch-stream-close-${id}-${body.content}`,
          `${output.readableEnded}:${output.destroyed}`,
        );
      });
      if (body.pipeline) {
        source.once('close', () => {
          webSocketFetchStreamCloseEvents.set(
            `ws-fetch-source-close-${id}-${body.content}`,
            `${source.readableEnded}:${source.destroyed}`,
          );
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
        pid: process.pid,
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
    @HTTPHeaders() headers: IncomingHttpHeaders,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    ctx.webSocket.send(JSON.stringify({
      type: 'error',
      message: error.message,
      header: headers['x-client-id'],
      path: ctx.path,
      pid: process.pid,
    }));
  }

  @WebSocketFetchOnClose()
  async onClose(
    @WebSocketCloseCode() code: number,
    @WebSocketCloseReason() reason: Buffer,
    @HTTPParam() id: string,
  ) {
    await this.appService.save({
      name: `ws-fetch-close-${id}`,
      desc: `${code}:${reason.toString()}`,
    });
  }
}
