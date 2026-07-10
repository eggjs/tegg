import assert from 'node:assert';
import type { IncomingMessage } from 'node:http';
import { Duplex, pipeline } from 'node:stream';
import pathToRegexp from 'path-to-regexp';
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
  WebSocketFetchClose,
  WebSocketFetchControllerMeta,
  WebSocketFetchMethodMeta,
  WebSocketMethodMeta,
  WebSocketParamType,
  WebSocketPathParamMeta,
  WebSocketQueriesParamMeta,
  WebSocketQueryParamMeta,
} from '@eggjs/tegg';
import { EggContainerFactory, EggPrototype } from '@eggjs/tegg/helper';
import { WebSocketUpgradeEvent } from '@eggjs/tegg-types/standalone';
import { ControllerRegister } from '../controller/ControllerRegister';
import { RootProtoManager } from '../controller/RootProtoManager';
import { ServiceWorkerWebSocketContext } from './ServiceWorkerWebSocketContext';

const noop = () => {
  // noop
};

interface WebSocketRoute {
  controllerProto: EggPrototype;
  controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta;
  methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta;
  methodRealPath: string;
  methodName: string;
  host?: string;
  keys: pathToRegexp.Key[];
  regexp: RegExp;
}

interface WebSocketMethodPayload {
  data?: RawData;
  close?: WebSocketFetchClose;
  error?: Error;
  closeCode?: number;
  closeReason?: Buffer;
  getWebSocketStream?: () => Duplex;
}

type Middleware = (ctx: ServiceWorkerWebSocketContext, next: Next) => Promise<void>;

export class WebSocketControllerRegister implements ControllerRegister {
  static instance?: WebSocketControllerRegister;

  private readonly checkRouters: Map<string, KoaRouter>;
  private readonly webSocketServer: WebSocketServer;
  private controllerProtos: EggPrototype[] = [];
  private routes: WebSocketRoute[] = [];

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
    const methodMap = new Map<WebSocketMethodMeta | WebSocketFetchMethodMeta, EggPrototype>();
    for (const proto of this.controllerProtos) {
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta | WebSocketFetchControllerMeta;
      for (const method of metadata.methods) {
        methodMap.set(method, proto);
      }
    }
    const allMethods = Array.from(methodMap.keys())
      .sort((a, b) => b.priority - a.priority);

    for (const method of allMethods) {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta | WebSocketFetchControllerMeta;
      this.checkDuplicate(controllerMeta, method);
    }

    this.routes = allMethods.flatMap(method => {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as WebSocketControllerMeta | WebSocketFetchControllerMeta;
      const hosts = this.getMethodHosts(controllerMeta, method) || [ undefined ];
      return hosts.map(host => this.createRoute(controllerProto, controllerMeta, method, host));
    });

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
    const matched = this.matchRoute(event.request, url);
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
              webSocket.close(1011, 'Internal Server Error');
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
    socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    socket.destroy();
  }

  private createRoute(
    controllerProto: EggPrototype,
    controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta,
    methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta,
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

  private checkDuplicate(controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
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
        router = new KoaRouter({ sensitive: true });
        this.checkRouters.set(host, router);
      }
      this.checkDuplicateInRouter(router, controllerMeta, methodMeta);
      this.registerToRouter(router, controllerMeta, methodMeta);
    });
  }

  private registerToRouter(router: KoaRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = this.getMethodRealPath(controllerMeta, methodMeta);
    const methodName = this.getMethodName(controllerMeta, methodMeta);
    Reflect.apply(router.get, router, [ methodName, methodRealPath, noop ]);
  }

  private checkDuplicateInRouter(router: KoaRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = this.getMethodRealPath(controllerMeta, methodMeta);
    const matched = router.match(methodRealPath, 'GET');
    const methodName = this.getMethodName(controllerMeta, methodMeta);
    if (matched.route) {
      const [ layer ] = matched.path;
      const err = new Error(`register websocket controller ${methodName} failed, ${controllerMeta.type} ${methodRealPath} is conflict with exists rule ${layer.path}`);
      throw FrameworkErrorFormater.format(err);
    }
  }

  private getMethodRealPath(controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    return (controllerMeta as any).getMethodRealPath(methodMeta);
  }

  private getMethodHosts(controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta): string[] | undefined {
    return (controllerMeta as any).getMethodHosts(methodMeta);
  }

  private getMethodName(controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta): string {
    return (controllerMeta as any).getMethodName(methodMeta);
  }

  private getMethodMiddlewares(controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta): Middleware[] {
    return (controllerMeta as any).getMethodMiddlewares(methodMeta);
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
    const webSocketCtx = new ServiceWorkerWebSocketContext({
      socket: webSocket,
      request: req,
      url,
      params,
    });
    const methodMiddlewares = this.getMethodMiddlewares(route.controllerMeta, route.methodMeta);
    let invoked = false;
    const handler = async (_ctx: ServiceWorkerWebSocketContext, next: Next) => {
      invoked = true;
      if (route.controllerMeta.type === ControllerType.WEBSOCKET_FETCH) {
        await this.invokeFetchController(route, webSocketCtx);
      } else {
        await this.invokeController(route, webSocketCtx);
      }
      await next();
    };

    await this.compose([ ...methodMiddlewares, handler ])(webSocketCtx, async () => {
      // final middleware
    });
    if (!invoked) {
      webSocket.close(1008, 'WebSocket middleware did not call next');
      return;
    }
    await this.waitWebSocketClose(webSocket);
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

  private async invokeController(route: WebSocketRoute, webSocketCtx: ServiceWorkerWebSocketContext) {
    const methodMeta = route.methodMeta as WebSocketMethodMeta;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    const realObj = eggObj.obj;
    const realMethod = realObj[methodMeta.name];
    let webSocketStream: Duplex | undefined;
    const getWebSocketStream = () => {
      if (!webSocketStream) {
        webSocketStream = createWebSocketStream(webSocketCtx.socket);
      }
      return webSocketStream;
    };
    const args = this.buildMethodArgs(methodMeta, webSocketCtx, { getWebSocketStream });
    const result = await Reflect.apply(realMethod, realObj, args);
    this.pipeResponseStream(result, webSocketCtx.socket, getWebSocketStream);
  }

  private buildMethodArgs(
    methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta,
    webSocketCtx: ServiceWorkerWebSocketContext,
    payload: WebSocketMethodPayload,
  ) {
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    const args: unknown[] = new Array(methodArgsLength);
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
          assert(payload.getWebSocketStream, '@WebSocketStream can not be used here');
          args[index] = payload.getWebSocketStream();
          break;
        }
        case WebSocketParamType.DATA: {
          args[index] = payload.data;
          break;
        }
        case WebSocketParamType.CLOSE: {
          args[index] = payload.close;
          break;
        }
        case WebSocketParamType.ERROR: {
          args[index] = payload.error;
          break;
        }
        case WebSocketParamType.CLOSE_CODE: {
          args[index] = payload.closeCode;
          break;
        }
        case WebSocketParamType.CLOSE_REASON: {
          args[index] = payload.closeReason;
          break;
        }
        default:
          assert.fail('never arrive');
      }
    }
    return args;
  }

  private async invokeFetchController(route: WebSocketRoute, webSocketCtx: ServiceWorkerWebSocketContext) {
    const controllerMeta = route.controllerMeta as WebSocketFetchControllerMeta;
    const methodMeta = route.methodMeta as WebSocketFetchMethodMeta;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    const realObj = eggObj.obj;
    const close = this.createFetchClose(webSocketCtx.socket);
    const responseStreams = new Set<NodeJS.ReadableStream>();
    let connectionClosed = false;
    let controllerReady = false;
    let resolveControllerReady!: () => void;
    const controllerReadyHandled = new Promise<void>(resolve => {
      resolveControllerReady = resolve;
    });
    let messageQueue = Promise.resolve();
    const invokeMethod = async (
      targetMethodMeta: WebSocketFetchMethodMeta | undefined,
      payload: WebSocketMethodPayload = {},
    ) => {
      if (!targetMethodMeta) {
        return;
      }
      const realMethod = realObj[targetMethodMeta.name];
      const args = this.buildMethodArgs(targetMethodMeta, webSocketCtx, {
        close,
        ...payload,
      });
      return await Reflect.apply(realMethod, realObj, args);
    };
    const handleError = async (error: Error) => {
      if (!controllerMeta.errorMethod) {
        console.error('[tegg/websocket-fetch] handle error:', error);
        return;
      }
      await invokeMethod(controllerMeta.errorMethod, { error });
    };
    const closeHandled = new Promise<void>(resolve => {
      webSocketCtx.socket.once('close', (code, reason) => {
        connectionClosed = true;
        this.destroyFetchResponseStreams(responseStreams);
        invokeMethod(controllerMeta.closeMethod, {
          closeCode: code,
          closeReason: reason,
        }).catch(error => {
          console.error('[tegg/websocket-fetch] handle close failed:', error);
        }).finally(resolve);
      });
    });

    webSocketCtx.socket.on('message', data => {
      if (connectionClosed) {
        return;
      }
      messageQueue = messageQueue.then(async () => {
        await controllerReadyHandled;
        if (!controllerReady || connectionClosed || webSocketCtx.socket.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          const result = await invokeMethod(methodMeta, { data });
          await this.sendFetchResponseStream(result, webSocketCtx.socket, responseStreams, handleError);
        } catch (error) {
          await handleError(error);
        }
      }).catch(error => {
        console.error('[tegg/websocket-fetch] handle message error failed:', error);
      });
    });
    webSocketCtx.socket.on('error', error => {
      handleError(error).catch(err => {
        console.error('[tegg/websocket-fetch] handle socket error failed:', err);
      });
    });

    try {
      await invokeMethod(controllerMeta.connectionMethod);
      await invokeMethod(controllerMeta.openMethod);
      controllerReady = true;
    } finally {
      resolveControllerReady();
    }
    await closeHandled;
  }

  private createFetchClose(webSocket: WebSocket): WebSocketFetchClose {
    return (code = 1000, reason?: string | Buffer) => {
      if (webSocket.readyState !== WebSocket.OPEN && webSocket.readyState !== WebSocket.CONNECTING) {
        return;
      }
      webSocket.close(code, reason);
    };
  }

  private async sendFetchResponseStream(
    result: unknown,
    webSocket: WebSocket,
    responseStreams: Set<NodeJS.ReadableStream>,
    handleError: (error: Error) => Promise<void>,
  ): Promise<void> {
    if (result === undefined || result === null) {
      return;
    }
    if (!this.isReadableStream(result)) {
      await handleError(new Error('WebSocketFetch method must return a readable stream or void')).catch(error => {
        console.error('[tegg/websocket-fetch] handle invalid response failed:', error);
      });
      return;
    }
    if (webSocket.readyState !== WebSocket.OPEN) {
      this.destroyFetchResponseStream(result);
      return;
    }
    responseStreams.add(result);
    await new Promise<void>(resolve => {
      let settled = false;
      const onData = (chunk: unknown) => {
        this.sendFetchChunk(webSocket, chunk, handleError);
      };
      const settle = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        result.removeListener('data', onData);
        responseStreams.delete(result);
        if (!error || webSocket.readyState !== WebSocket.OPEN) {
          resolve();
          return;
        }
        handleError(error).catch(err => {
          console.error('[tegg/websocket-fetch] handle stream error failed:', err);
        }).finally(resolve);
      };
      result.once('end', () => settle());
      result.once('close', () => settle());
      result.once('error', settle);
      result.on('data', onData);
      const state = result as NodeJS.ReadableStream & {
        closed?: boolean;
        errored?: Error | null;
        readableEnded?: boolean;
      };
      if (state.errored) {
        settle(state.errored);
      } else if (state.closed || state.readableEnded) {
        settle();
      }
    });
  }

  private destroyFetchResponseStreams(responseStreams: Set<NodeJS.ReadableStream>) {
    for (const responseStream of responseStreams) {
      this.destroyFetchResponseStream(responseStream);
    }
    responseStreams.clear();
  }

  private destroyFetchResponseStream(responseStream: NodeJS.ReadableStream) {
    const destroy = (responseStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy;
    if (typeof destroy !== 'function') {
      return;
    }
    try {
      Reflect.apply(destroy, responseStream, []);
    } catch (error) {
      console.error('[tegg/websocket-fetch] destroy response stream failed:', error);
    }
  }

  private sendFetchChunk(
    webSocket: WebSocket,
    chunk: unknown,
    handleError: (error: Error) => Promise<void>,
  ) {
    if (webSocket.readyState !== WebSocket.OPEN) {
      return;
    }
    webSocket.send(chunk as any, error => {
      if (!error) {
        return;
      }
      handleError(error).catch(err => {
        console.error('[tegg/websocket-fetch] handle send error failed:', err);
      });
    });
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
      console.error('[tegg/websocket] pipe response stream failed:', error);
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
}
