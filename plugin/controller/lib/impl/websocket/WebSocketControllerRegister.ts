import assert from 'node:assert';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import compose from 'koa-compose';
import { Application, Context } from 'egg';
import { EggRouter } from '@eggjs/router';
import { FrameworkErrorFormater } from 'egg-errors';
import { createWebSocketStream, RawData, WebSocket, WebSocketServer } from 'ws';
import {
  CONTROLLER_META_DATA,
  ControllerMetadata,
  ControllerType,
  Next,
  WebSocketControllerMeta,
  WebSocketFetchControllerMeta,
  WebSocketFetchMethodMeta,
  WebSocketMethodMeta,
} from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import {
  WebSocketControllerRuntime,
  WebSocketEventStream,
  WebSocketRoute,
  createWebSocketRoutes,
  getWebSocketMethodHosts,
  getWebSocketMethodMiddlewares,
  getWebSocketMethodName,
  getWebSocketMethodRealPath,
  matchWebSocketRoute,
  waitForWebSocketClose,
  WEBSOCKET_INTERNAL_ERROR_CODE,
  WEBSOCKET_INTERNAL_ERROR_REASON,
} from '@eggjs/tegg-websocket-runtime';
import { ROOT_PROTO } from '@eggjs/egg-module-common';
import { ControllerRegister } from '../../ControllerRegister';
import { RouterConflictError } from '../../errors';
import { extendWebSocketContext } from './WebSocketContext';

const noop = () => {
  // noop
};

export class WebSocketControllerRegister implements ControllerRegister {
  static instance?: WebSocketControllerRegister;

  private readonly app: Application;
  private readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly checkRouters: Map<string, EggRouter>;
  private controllerProtos: EggPrototype[] = [];
  private routes: Array<WebSocketRoute<EggPrototype>> = [];
  private webSocketServer?: WebSocketServer;
  private upgradeHandler?: (req: IncomingMessage, socket: Duplex, head: Buffer) => void;
  private listening = false;

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application) {
    assert(
      controllerMeta.type === ControllerType.WEBSOCKET || controllerMeta.type === ControllerType.WEBSOCKET_FETCH,
      'controller meta type is not WEBSOCKET or WEBSOCKET_FETCH',
    );
    if (!WebSocketControllerRegister.instance) {
      WebSocketControllerRegister.instance = new WebSocketControllerRegister(app);
    }
    WebSocketControllerRegister.instance.controllerProtos.push(proto);
    return WebSocketControllerRegister.instance;
  }

  constructor(app: Application) {
    this.app = app;
    this.eggContainerFactory = app.eggContainerFactory;
    this.checkRouters = new Map();
    this.checkRouters.set('default', new EggRouter({ sensitive: true }, {} as any));
  }

  register(): Promise<void> {
    return Promise.resolve();
  }

  static clean() {
    this.instance?.close();
    this.instance = undefined;
  }

  doRegister() {
    this.routes = createWebSocketRoutes(
      this.controllerProtos,
      proto => proto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta | WebSocketFetchControllerMeta,
      (controllerMeta, methodMeta) => this.checkDuplicate(controllerMeta, methodMeta),
    );
  }

  listen() {
    if (this.listening || !this.routes.length) {
      return;
    }
    const server = (this.app as any).server;
    if (!server) {
      return;
    }

    this.webSocketServer = new WebSocketServer({ noServer: true });
    this.upgradeHandler = (req, socket, head) => {
      this.handleUpgrade(req, socket, head).catch(error => {
        this.app.logger.error('[tegg/websocket] handle upgrade failed: %s', error.stack || error.message);
        this.rejectSocket(socket, 500, 'Internal Server Error');
      });
    };
    server.on('upgrade', this.upgradeHandler);
    this.listening = true;
  }

  close() {
    const server = (this.app as any).server;
    if (server && this.upgradeHandler) {
      server.removeListener('upgrade', this.upgradeHandler);
    }
    this.webSocketServer?.close();
    this.webSocketServer = undefined;
    this.upgradeHandler = undefined;
    this.listening = false;
    this.routes = [];
    this.controllerProtos = [];
    this.checkRouters.clear();
  }

  private checkDuplicate(controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    let router = this.checkRouters.get('default')!;
    const hosts = getWebSocketMethodHosts(controllerMeta, methodMeta) || [];
    if (!hosts.length) {
      this.checkDuplicateInRouter(router, controllerMeta, methodMeta);
      this.registerToRouter(router, controllerMeta, methodMeta);
      return;
    }

    hosts.forEach(host => {
      router = this.checkRouters.get(host)!;
      if (!router) {
        router = new EggRouter({ sensitive: true }, {} as any);
        this.checkRouters.set(host, router);
      }
      this.checkDuplicateInRouter(router, controllerMeta, methodMeta);
      this.registerToRouter(router, controllerMeta, methodMeta);
    });
  }

  private registerToRouter(router: EggRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = getWebSocketMethodRealPath(controllerMeta, methodMeta);
    const methodName = getWebSocketMethodName(controllerMeta, methodMeta);
    Reflect.apply(router.get, router, [ methodName, methodRealPath, noop ]);
  }

  private checkDuplicateInRouter(router: EggRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = getWebSocketMethodRealPath(controllerMeta, methodMeta);
    const matched = router.match(methodRealPath, 'GET');
    const methodName = getWebSocketMethodName(controllerMeta, methodMeta);
    if (matched.route) {
      const [ layer ] = matched.path;
      const err = new RouterConflictError(`register websocket controller ${methodName} failed, ${controllerMeta.type} ${methodRealPath} is conflict with exists rule ${layer.path}`);
      throw FrameworkErrorFormater.format(err);
    }
  }

  private async handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const res = new ServerResponse(req);
    const eggCtx = this.app.createContext(req, res) as unknown as Context;
    const url = this.createURL(eggCtx);
    let matched: { route: WebSocketRoute<EggPrototype>; params: Record<string, string> } | undefined;
    try {
      matched = matchWebSocketRoute(this.routes, url.pathname, eggCtx.host);
    } catch (error) {
      if (error instanceof URIError) {
        this.app.logger.warn('[tegg/websocket] reject malformed request path: %s', req.url);
        this.rejectSocket(socket, 400, 'Bad Request');
        return;
      }
      throw error;
    }
    if (!matched) {
      const initialBytesWritten = this.getSocketBytesWritten(socket);
      setImmediate(() => {
        if (
          socket.destroyed ||
          socket.writableEnded ||
          this.getSocketBytesWritten(socket) > initialBytesWritten ||
          this.hasWebSocketOwner(socket)
        ) {
          return;
        }
        this.app.logger.warn('[tegg/websocket] no route matched upgrade request: %s', req.url);
        this.rejectSocket(socket, 404, 'Not Found');
      });
      return;
    }

    this.webSocketServer!.handleUpgrade(req, socket, head, webSocket => {
      this.handleConnection(matched.route, matched.params, eggCtx, webSocket)
        .catch(error => {
          this.app.logger.error('[tegg/websocket] handle connection failed: %s', error.stack || error.message);
          if (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING) {
            webSocket.close(WEBSOCKET_INTERNAL_ERROR_CODE, WEBSOCKET_INTERNAL_ERROR_REASON);
          }
        });
    });
  }

  private createURL(ctx: Context): URL {
    const host = ctx.host || 'localhost';
    return new URL(ctx.url || '/', `${ctx.protocol}://${host}`);
  }

  private async handleConnection(
    route: WebSocketRoute<EggPrototype>,
    params: Record<string, string>,
    eggCtx: Context,
    webSocket: WebSocket,
  ) {
    const closeHandled = waitForWebSocketClose(webSocket, error => {
      this.app.logger.error('[tegg/websocket] socket error while waiting for close: %s', error.stack || error.message);
    });
    Reflect.set(eggCtx, ROOT_PROTO, route.controllerProto);
    const webSocketCtx = extendWebSocketContext(eggCtx, webSocket, params);
    const fetchEvents = route.controllerMeta.type === ControllerType.WEBSOCKET_FETCH
      ? new WebSocketEventStream<RawData, Buffer>(webSocket)
      : undefined;
    const runtime = new WebSocketControllerRuntime<WebSocket, RawData, Buffer>({
      context: {
        context: webSocketCtx,
        socket: webSocket,
        params: webSocketCtx.params,
        query: webSocketCtx.query,
        queries: webSocketCtx.queries,
        headers: webSocketCtx.headers,
        request: webSocketCtx.req,
      },
      createWebSocketStream,
      runInContext: callback => this.app.ctxStorage.run(eggCtx, callback),
      logger: {
        debug: message => this.app.logger.debug('[tegg/websocket] %s', message),
        error: (message, error) => {
          if (error) {
            this.app.logger.error('[tegg/websocket] %s: %s', message, error.stack || error.message);
            return;
          }
          this.app.logger.error('[tegg/websocket] %s', message);
        },
      },
    });
    const lifecycleMiddleware = this.app.middleware.teggCtxLifecycleMiddleware();
    const methodMiddlewares = getWebSocketMethodMiddlewares(route.controllerMeta, route.methodMeta);
    let invoked = false;
    const handler = async (_ctx: Context, next: Next) => {
      invoked = true;
      if (route.controllerMeta.type === ControllerType.WEBSOCKET_FETCH) {
        await this.invokeFetchController(route, runtime, fetchEvents!);
      } else {
        await this.invokeController(route, runtime);
      }
      await next();
    };
    const composed = compose([ ...methodMiddlewares, handler ]);

    try {
      await this.app.ctxStorage.run(eggCtx, async () => {
        await lifecycleMiddleware(eggCtx, async () => {
          await composed(eggCtx, async () => {
            // final middleware
          });
          if (!invoked) {
            this.app.logger.debug('[tegg/websocket] %s was short-circuited by middleware', route.methodName);
          }
          await closeHandled;
        });
      });
    } finally {
      fetchEvents?.dispose();
    }
  }

  private async invokeController(
    route: WebSocketRoute<EggPrototype>,
    runtime: WebSocketControllerRuntime<WebSocket, RawData, Buffer>,
  ) {
    const methodMeta = route.methodMeta as WebSocketMethodMeta;
    const controllerMeta = route.controllerMeta as WebSocketControllerMeta;
    const eggObj = await this.eggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    await runtime.invokeController(eggObj.obj, controllerMeta, methodMeta);
  }

  private async invokeFetchController(
    route: WebSocketRoute<EggPrototype>,
    runtime: WebSocketControllerRuntime<WebSocket, RawData, Buffer>,
    events: WebSocketEventStream<RawData, Buffer>,
  ) {
    const controllerMeta = route.controllerMeta as WebSocketFetchControllerMeta;
    const methodMeta = route.methodMeta as WebSocketFetchMethodMeta;
    const eggObj = await this.eggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    await runtime.invokeFetchController(eggObj.obj, controllerMeta, methodMeta, events);
  }

  private rejectSocket(socket: Duplex, status: number, message: string) {
    if (socket.destroyed) {
      return;
    }
    const body = message;
    socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  private getSocketBytesWritten(socket: Duplex): number {
    return (socket as Duplex & { bytesWritten?: number }).bytesWritten || 0;
  }

  private hasWebSocketOwner(socket: Duplex): boolean {
    return Object.getOwnPropertySymbols(socket).some(symbol => {
      return symbol.description === 'websocket' && Boolean(Reflect.get(socket, symbol));
    });
  }
}
