import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { PassThrough, type Readable } from 'node:stream';
import type { RawData, WebSocket } from 'ws';
import {
  Context,
  Headers,
  Inject,
  Param,
  Queries,
  Query,
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

interface WebSocketFetchRequest {
  content: string;
  close?: boolean;
  error?: boolean;
  delayMs?: number;
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
    @Param() id: string,
    @Query() name: string,
    @Queries({ name: 'tag' }) tags: string[],
    @Headers() headers: IncomingHttpHeaders,
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
    @Param() id: string,
    @Query() name: string,
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
}

@WebSocketFetchController({
  path: '/ws-fetch/:id',
})
export class AppWebSocketFetchController {
  @Inject()
  appService: AppService;

  @WebSocketFetchOnConnection()
  onConnection(
    @Headers() headers: IncomingHttpHeaders,
    @Context() ctx: WebSocketContext<WebSocket>,
  ) {
    ctx.socket.send(JSON.stringify({
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
    ctx.socket.send(JSON.stringify({
      type: 'open',
      path: ctx.path,
      pid: process.pid,
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
    const output = new PassThrough();
    output.write(JSON.stringify({
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

    setTimeout(() => {
      if (output.destroyed) {
        return;
      }
      if (body.error) {
        output.destroy(new Error(`fetch error: ${body.content}`));
        return;
      }
      output.write(JSON.stringify({
        type: 'data',
        phase: 2,
        id,
        content: body.content,
        pid: process.pid,
      }));
      output.end();
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
      pid: process.pid,
    }));
  }

  @WebSocketFetchOnClose()
  async onClose(
    @WebSocketCloseCode() code: number,
    @WebSocketCloseReason() reason: Buffer,
    @Param() id: string,
  ) {
    await this.appService.save({
      name: `ws-fetch-close-${id}`,
      desc: `${code}:${reason.toString()}`,
    });
  }
}
