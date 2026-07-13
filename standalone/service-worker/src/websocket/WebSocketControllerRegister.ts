import assert from 'node:assert';
import type { IncomingMessage } from 'node:http';
import { Duplex } from 'node:stream';
import { Router as KoaRouter } from '@eggjs/router';
import { FrameworkErrorFormater } from 'egg-errors';
import { createWebSocketStream, RawData, WebSocket, WebSocketServer } from 'ws';
import {
  CONTROLLER_META_DATA,
  ControllerMetadata,
  ControllerType,
  EggContext,
  Next,
  WebSocketControllerMeta,
  WebSocketFetchControllerMeta,
  WebSocketFetchMethodMeta,
  WebSocketMethodMeta,
} from '@eggjs/tegg';
import { EggContainerFactory, EggPrototype } from '@eggjs/tegg/helper';
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
import { WebSocketUpgradeEvent } from '@eggjs/tegg-types/standalone';
import { ControllerRegister } from '../controller/ControllerRegister';
import { RootProtoManager } from '../controller/RootProtoManager';
import { ServiceWorkerWebSocketContext } from './ServiceWorkerWebSocketContext';

const noop = () => {
  // noop
};

type Middleware = (ctx: ServiceWorkerWebSocketContext, next: Next) => Promise<void>;

export class WebSocketControllerRegister implements ControllerRegister {
  static instance?: WebSocketControllerRegister;

  private readonly checkRouters: Map<string, KoaRouter>;
  private readonly webSocketServer: WebSocketServer;
  private controllerProtos: EggPrototype[] = [];
  private routes: Array<WebSocketRoute<EggPrototype>> = [];

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata) {
    assert(
      controllerMeta.type === ControllerType.WEBSOCKET || controllerMeta.type === ControllerType.WEBSOCKET_FETCH,
      'controller meta type is not WEBSOCKET or WEBSOCKET_FETCH',
    );
    if (!WebSocketControllerRegister.instance) {
      WebSocketControllerRegister.instance = new WebSocketControllerRegister();
    }
    WebSocketControllerRegister.instance.controllerProtos.push(proto);
    return WebSocketControllerRegister.instance;
  }

  constructor() {
    this.checkRouters = new Map();
    this.checkRouters.set('default', new KoaRouter({ sensitive: true }));
    this.webSocketServer = new WebSocketServer({ noServer: true });
  }

  register(): Promise<void> {
    return Promise.resolve();
  }

  static clean() {
    this.instance?.close();
    this.instance = undefined;
  }

  doRegister(rootProtoManager: RootProtoManager) {
    this.routes = createWebSocketRoutes(
      this.controllerProtos,
      proto => proto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta | WebSocketFetchControllerMeta,
      (controllerMeta, methodMeta) => this.checkDuplicate(controllerMeta, methodMeta),
    );

    for (const route of this.routes) {
      rootProtoManager.registerRootProto('GET', (ctx: EggContext) => {
        if (route.regexp.test(ctx.path)) {
          return route.controllerProto;
        }
      }, route.host || '');
    }
  }

  close() {
    this.webSocketServer.close();
    this.routes = [];
    this.controllerProtos = [];
    this.checkRouters.clear();
  }

  async handleUpgrade(event: WebSocketUpgradeEvent): Promise<boolean> {
    const url = this.createURL(event.request);
    let matched: { route: WebSocketRoute<EggPrototype>; params: Record<string, string> } | undefined;
    try {
      matched = matchWebSocketRoute(this.routes, url.pathname, event.request.headers.host);
    } catch (error) {
      if (error instanceof URIError) {
        console.warn('[tegg/websocket] reject malformed request path:', event.request.url);
        WebSocketControllerRegister.rejectSocket(event.socket, 400, 'Bad Request');
        return true;
      }
      throw error;
    }
    if (!matched) {
      return false;
    }

    await new Promise<void>(resolve => {
      this.webSocketServer.handleUpgrade(event.request, event.socket as any, event.head, webSocket => {
        this.handleConnection(matched.route, matched.params, url, event.request, webSocket)
          .then(resolve)
          .catch(error => {
            console.error('[tegg/websocket] handle connection failed:', error);
            if (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING) {
              webSocket.close(WEBSOCKET_INTERNAL_ERROR_CODE, WEBSOCKET_INTERNAL_ERROR_REASON);
            }
            resolve();
          });
      });
    });
    return true;
  }

  static rejectSocket(socket: Duplex, status: number, message: string) {
    if (socket.destroyed) {
      return;
    }
    const body = message;
    socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
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
        router = new KoaRouter({ sensitive: true });
        this.checkRouters.set(host, router);
      }
      this.checkDuplicateInRouter(router, controllerMeta, methodMeta);
      this.registerToRouter(router, controllerMeta, methodMeta);
    });
  }

  private registerToRouter(router: KoaRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = getWebSocketMethodRealPath(controllerMeta, methodMeta);
    const methodName = getWebSocketMethodName(controllerMeta, methodMeta);
    Reflect.apply(router.get, router, [ methodName, methodRealPath, noop ]);
  }

  private checkDuplicateInRouter(router: KoaRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = getWebSocketMethodRealPath(controllerMeta, methodMeta);
    const matched = router.match(methodRealPath, 'GET');
    const methodName = getWebSocketMethodName(controllerMeta, methodMeta);
    if (matched.route) {
      const [ layer ] = matched.path;
      const err = new Error(`register websocket controller ${methodName} failed, ${controllerMeta.type} ${methodRealPath} is conflict with exists rule ${layer.path}`);
      throw FrameworkErrorFormater.format(err);
    }
  }

  private createURL(req: IncomingMessage): URL {
    const host = req.headers.host || 'localhost';
    return new URL(req.url || '/', `http://${host}`);
  }

  private async handleConnection(
    route: WebSocketRoute<EggPrototype>,
    params: Record<string, string>,
    url: URL,
    req: IncomingMessage,
    webSocket: WebSocket,
  ) {
    const closeHandled = waitForWebSocketClose(webSocket, error => {
      console.error('[tegg/websocket] socket error while waiting for close:', error);
    });
    const webSocketCtx = new ServiceWorkerWebSocketContext({
      socket: webSocket,
      request: req,
      url,
      params,
    });
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
        request: webSocketCtx.request,
      },
      createWebSocketStream,
      logger: {
        debug: message => console.debug(`[tegg/websocket] ${message}`),
        error: (message, error) => console.error(`[tegg/websocket] ${message}:`, error || ''),
      },
    });
    const methodMiddlewares = getWebSocketMethodMiddlewares(
      route.controllerMeta,
      route.methodMeta,
    ) as unknown as Middleware[];
    let invoked = false;
    const handler = async (_ctx: ServiceWorkerWebSocketContext, next: Next) => {
      invoked = true;
      if (route.controllerMeta.type === ControllerType.WEBSOCKET_FETCH) {
        await this.invokeFetchController(route, runtime, fetchEvents!);
      } else {
        await this.invokeController(route, runtime);
      }
      await next();
    };

    try {
      await this.compose([ ...methodMiddlewares, handler ])(webSocketCtx, async () => {
        // final middleware
      });
      if (!invoked) {
        console.debug(`[tegg/websocket] ${route.methodName} was short-circuited by middleware`);
      }
      await closeHandled;
    } finally {
      fetchEvents?.dispose();
    }
  }

  private compose(middlewares: Middleware[]) {
    return async (ctx: ServiceWorkerWebSocketContext, next: Next) => {
      let index = -1;
      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) {
          throw new Error('next() called multiple times');
        }
        index = i;
        const fn = middlewares[i] || next;
        if (!fn) {
          return;
        }
        await fn(ctx, () => dispatch(i + 1));
      };
      await dispatch(0);
    };
  }

  private async invokeController(
    route: WebSocketRoute<EggPrototype>,
    runtime: WebSocketControllerRuntime<WebSocket, RawData, Buffer>,
  ) {
    const controllerMeta = route.controllerMeta as WebSocketControllerMeta;
    const methodMeta = route.methodMeta as WebSocketMethodMeta;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    await runtime.invokeController(eggObj.obj, controllerMeta, methodMeta);
  }

  private async invokeFetchController(
    route: WebSocketRoute<EggPrototype>,
    runtime: WebSocketControllerRuntime<WebSocket, RawData, Buffer>,
    events: WebSocketEventStream<RawData, Buffer>,
  ) {
    const controllerMeta = route.controllerMeta as WebSocketFetchControllerMeta;
    const methodMeta = route.methodMeta as WebSocketFetchMethodMeta;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    await runtime.invokeFetchController(eggObj.obj, controllerMeta, methodMeta, events);
  }

}
