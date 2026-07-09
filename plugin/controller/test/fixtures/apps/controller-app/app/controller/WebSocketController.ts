import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { PassThrough, type Readable } from 'node:stream';
import type { WebSocket } from 'ws';
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
  WebSocketMethod,
  WebSocketSocket,
  WebSocketStream,
} from '@eggjs/tegg';
import AppService from '../../modules/multi-module-service/AppService';

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
