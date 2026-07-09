import assert from 'node:assert';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex, pipeline } from 'node:stream';
import compose from 'koa-compose';
import pathToRegexp from 'path-to-regexp';
import { Application, Context } from 'egg';
import { EggRouter } from '@eggjs/router';
import { FrameworkErrorFormater } from 'egg-errors';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';
import {
  CONTROLLER_META_DATA,
  ControllerMetadata,
  ControllerType,
  Next,
  WebSocketControllerMeta,
  WebSocketMethodMeta,
  WebSocketParamType,
  WebSocketPathParamMeta,
  WebSocketQueriesParamMeta,
  WebSocketQueryParamMeta,
} from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ROOT_PROTO } from '@eggjs/egg-module-common';
import { ControllerRegister } from '../../ControllerRegister';
import { RouterConflictError } from '../../errors';
import { WebSocketContextImpl } from './WebSocketContext';

const noop = () => {
  // noop
};

interface WebSocketRoute {
  controllerProto: EggPrototype;
  controllerMeta: WebSocketControllerMeta;
  methodMeta: WebSocketMethodMeta;
  methodRealPath: string;
  methodName: string;
  host?: string;
  keys: pathToRegexp.Key[];
  regexp: RegExp;
}

export class WebSocketControllerRegister implements ControllerRegister {
  static instance?: WebSocketControllerRegister;

  private readonly app: Application;
  private readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly checkRouters: Map<string, EggRouter>;
  private controllerProtos: EggPrototype[] = [];
  private routes: WebSocketRoute[] = [];
  private webSocketServer?: WebSocketServer;
  private upgradeHandler?: (req: IncomingMessage, socket: Duplex, head: Buffer) => void;
  private listening = false;

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application) {
    assert(
      controllerMeta.type === ControllerType.WEBSOCKET,
      'controller meta type is not WEBSOCKET',
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
    const methodMap = new Map<WebSocketMethodMeta, EggPrototype>();
    for (const proto of this.controllerProtos) {
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta;
      for (const method of metadata.methods) {
        methodMap.set(method, proto);
      }
    }
    const allMethods = Array.from(methodMap.keys())
      .sort((a, b) => b.priority - a.priority);

    for (const method of allMethods) {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta;
      this.checkDuplicate(controllerMeta, method);
    }

    this.routes = allMethods.flatMap(method => {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta;
      const hosts = this.getMethodHosts(controllerMeta, method) || [ undefined ];
      return hosts.map(host => this.createRoute(controllerProto, controllerMeta, method, host));
    });
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

  private createRoute(
    controllerProto: EggPrototype,
    controllerMeta: WebSocketControllerMeta,
    methodMeta: WebSocketMethodMeta,
    host: string | undefined,
  ): WebSocketRoute {
    const methodRealPath = this.getMethodRealPath(controllerMeta, methodMeta);
    const keys: pathToRegexp.Key[] = [];
    const regexp = pathToRegexp(methodRealPath, keys, { sensitive: true });
    return {
      controllerProto,
      controllerMeta,
      methodMeta,
      methodRealPath,
      methodName: this.getMethodName(controllerMeta, methodMeta),
      host,
      keys,
      regexp,
    };
  }

  private checkDuplicate(controllerMeta: WebSocketControllerMeta, methodMeta: WebSocketMethodMeta) {
    let router = this.checkRouters.get('default')!;
    const hosts = this.getMethodHosts(controllerMeta, methodMeta) || [];
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

  private registerToRouter(router: EggRouter, controllerMeta: WebSocketControllerMeta, methodMeta: WebSocketMethodMeta) {
    const methodRealPath = this.getMethodRealPath(controllerMeta, methodMeta);
    const methodName = this.getMethodName(controllerMeta, methodMeta);
    Reflect.apply(router.get, router, [ methodName, methodRealPath, noop ]);
  }

  private checkDuplicateInRouter(router: EggRouter, controllerMeta: WebSocketControllerMeta, methodMeta: WebSocketMethodMeta) {
    const methodRealPath = this.getMethodRealPath(controllerMeta, methodMeta);
    const matched = router.match(methodRealPath, 'GET');
    const methodName = this.getMethodName(controllerMeta, methodMeta);
    if (matched.route) {
      const [ layer ] = matched.path;
      const err = new RouterConflictError(`register websocket controller ${methodName} failed, ${controllerMeta.type} ${methodRealPath} is conflict with exists rule ${layer.path}`);
      throw FrameworkErrorFormater.format(err);
    }
  }

  private getMethodRealPath(controllerMeta: WebSocketControllerMeta, methodMeta: WebSocketMethodMeta) {
    return controllerMeta.getMethodRealPath(methodMeta);
  }

  private getMethodHosts(controllerMeta: WebSocketControllerMeta, methodMeta: WebSocketMethodMeta): string[] | undefined {
    return controllerMeta.getMethodHosts(methodMeta);
  }

  private getMethodName(controllerMeta: WebSocketControllerMeta, methodMeta: WebSocketMethodMeta): string {
    return controllerMeta.getMethodName(methodMeta);
  }

  private getMethodMiddlewares(controllerMeta: WebSocketControllerMeta, methodMeta: WebSocketMethodMeta) {
    return controllerMeta.getMethodMiddlewares(methodMeta);
  }

  private async handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const url = this.createURL(req);
    const matched = this.matchRoute(req, url);
    if (!matched) {
      this.rejectSocket(socket, 404, 'Not Found');
      return;
    }

    this.webSocketServer!.handleUpgrade(req, socket, head, webSocket => {
      this.handleConnection(matched.route, matched.params, url, req, webSocket)
        .catch(error => {
          this.app.logger.error('[tegg/websocket] handle connection failed: %s', error.stack || error.message);
          if (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING) {
            webSocket.close(1011, 'Internal Server Error');
          }
        });
    });
  }

  private createURL(req: IncomingMessage): URL {
    const host = req.headers.host || 'localhost';
    return new URL(req.url || '/', `http://${host}`);
  }

  private matchRoute(req: IncomingMessage, url: URL): { route: WebSocketRoute; params: Record<string, string> } | undefined {
    for (const route of this.routes) {
      if (route.host && !this.matchHost(route.host, req.headers.host)) {
        continue;
      }
      const matched = route.regexp.exec(url.pathname);
      if (!matched) {
        continue;
      }
      const params: Record<string, string> = {};
      route.keys.forEach((key, index) => {
        params[String(key.name)] = decodeURIComponent(matched[index + 1]);
      });
      return { route, params };
    }
  }

  private matchHost(expectedHost: string, requestHost: string | undefined) {
    if (!requestHost) {
      return false;
    }
    return requestHost === expectedHost || requestHost.split(':')[0] === expectedHost;
  }

  private async handleConnection(
    route: WebSocketRoute,
    params: Record<string, string>,
    url: URL,
    req: IncomingMessage,
    webSocket: WebSocket,
  ) {
    const res = new ServerResponse(req);
    const eggCtx = this.app.createContext(req, res) as unknown as Context;
    (eggCtx as any)[ROOT_PROTO] = route.controllerProto;
    const webSocketCtx = new WebSocketContextImpl({
      socket: webSocket,
      request: req,
      url,
      params,
    });
    const lifecycleMiddleware = this.app.middleware.teggCtxLifecycleMiddleware();
    const methodMiddlewares = this.getMethodMiddlewares(route.controllerMeta, route.methodMeta);
    let invoked = false;
    const handler = async (_ctx: Context, next: Next) => {
      invoked = true;
      await this.invokeController(route, webSocketCtx);
      await next();
    };
    const composed = compose([ ...methodMiddlewares, handler ]);

    await this.app.ctxStorage.run(eggCtx, async () => {
      await lifecycleMiddleware(eggCtx, async () => {
        await composed(eggCtx, async () => {
          // final middleware
        });
        if (!invoked) {
          webSocket.close(1008, 'WebSocket middleware did not call next');
          return;
        }
        await this.waitWebSocketClose(webSocket);
      });
    });
  }

  private async invokeController(route: WebSocketRoute, webSocketCtx: WebSocketContextImpl) {
    const methodMeta = route.methodMeta as WebSocketMethodMeta;
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    const eggObj = await this.eggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    const realObj = eggObj.obj;
    const realMethod = realObj[methodMeta.name];
    const args: Array<object | string | string[] | undefined> = new Array(methodArgsLength);
    let webSocketStream: Duplex | undefined;
    const getWebSocketStream = () => {
      if (!webSocketStream) {
        webSocketStream = createWebSocketStream(webSocketCtx.socket);
      }
      return webSocketStream;
    };
    if (hasContext) {
      args[contextIndex!] = webSocketCtx;
    }
    for (const [ index, param ] of methodMeta.paramMap) {
      switch (param.type) {
        case WebSocketParamType.PARAM: {
          const pathParam = param as WebSocketPathParamMeta;
          args[index] = webSocketCtx.params[pathParam.name];
          break;
        }
        case WebSocketParamType.QUERY: {
          const queryParam = param as WebSocketQueryParamMeta;
          args[index] = webSocketCtx.query[queryParam.name];
          break;
        }
        case WebSocketParamType.QUERIES: {
          const queryParam = param as WebSocketQueriesParamMeta;
          args[index] = webSocketCtx.queries[queryParam.name] || [];
          break;
        }
        case WebSocketParamType.HEADERS: {
          args[index] = webSocketCtx.headers;
          break;
        }
        case WebSocketParamType.REQUEST: {
          args[index] = webSocketCtx.request;
          break;
        }
        case WebSocketParamType.SOCKET: {
          args[index] = webSocketCtx.socket;
          break;
        }
        case WebSocketParamType.STREAM: {
          args[index] = getWebSocketStream();
          break;
        }
        default:
          assert.fail('never arrive');
      }
    }

    const result = await Reflect.apply(realMethod, realObj, args);
    this.pipeResponseStream(result, webSocketCtx.socket, getWebSocketStream);
  }

  private pipeResponseStream(result: unknown, webSocket: WebSocket, getWebSocketStream: () => Duplex) {
    if (!this.isReadableStream(result)) {
      return;
    }

    pipeline(result, getWebSocketStream(), error => {
      if (!error) {
        return;
      }
      if (webSocket.readyState === WebSocket.CLOSED || webSocket.readyState === WebSocket.CLOSING) {
        return;
      }
      this.app.logger.error('[tegg/websocket] pipe response stream failed: %s', error.stack || error.message);
      webSocket.close(1011, 'Internal Server Error');
    });
  }

  private isReadableStream(result: unknown): result is NodeJS.ReadableStream {
    return !!result && typeof (result as NodeJS.ReadableStream).pipe === 'function';
  }

  private waitWebSocketClose(webSocket: WebSocket): Promise<void> {
    if (webSocket.readyState === WebSocket.CLOSED || webSocket.readyState === WebSocket.CLOSING) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      webSocket.once('close', () => resolve());
      webSocket.once('error', () => resolve());
    });
  }

  private rejectSocket(socket: Duplex, status: number, message: string) {
    if (socket.destroyed) {
      return;
    }
    const body = message;
    socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    socket.destroy();
  }
}
