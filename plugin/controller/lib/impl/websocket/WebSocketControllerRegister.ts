import assert from 'node:assert';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex, pipeline } from 'node:stream';
import compose from 'koa-compose';
import pathToRegexp from 'path-to-regexp';
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
  WebSocketFetchClose,
  WebSocketFetchControllerMeta,
  WebSocketFetchMethodMeta,
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
        router = new EggRouter({ sensitive: true }, {} as any);
        this.checkRouters.set(host, router);
      }
      this.checkDuplicateInRouter(router, controllerMeta, methodMeta);
      this.registerToRouter(router, controllerMeta, methodMeta);
    });
  }

  private registerToRouter(router: EggRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = this.getMethodRealPath(controllerMeta, methodMeta);
    const methodName = this.getMethodName(controllerMeta, methodMeta);
    Reflect.apply(router.get, router, [ methodName, methodRealPath, noop ]);
  }

  private checkDuplicateInRouter(router: EggRouter, controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    const methodRealPath = this.getMethodRealPath(controllerMeta, methodMeta);
    const matched = router.match(methodRealPath, 'GET');
    const methodName = this.getMethodName(controllerMeta, methodMeta);
    if (matched.route) {
      const [ layer ] = matched.path;
      const err = new RouterConflictError(`register websocket controller ${methodName} failed, ${controllerMeta.type} ${methodRealPath} is conflict with exists rule ${layer.path}`);
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

  private getMethodMiddlewares(controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta, methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta) {
    return (controllerMeta as any).getMethodMiddlewares(methodMeta);
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
      if (route.controllerMeta.type === ControllerType.WEBSOCKET_FETCH) {
        await this.invokeFetchController(route, webSocketCtx, eggCtx);
      } else {
        await this.invokeController(route, webSocketCtx);
      }
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
    const eggObj = await this.eggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
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
    webSocketCtx: WebSocketContextImpl,
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

  private async invokeFetchController(route: WebSocketRoute, webSocketCtx: WebSocketContextImpl, eggCtx: Context) {
    const controllerMeta = route.controllerMeta as WebSocketFetchControllerMeta;
    const methodMeta = route.methodMeta as WebSocketFetchMethodMeta;
    const eggObj = await this.eggContainerFactory.getOrCreateEggObject(route.controllerProto, route.controllerProto.name);
    const realObj = eggObj.obj;
    const close = this.createFetchClose(webSocketCtx.socket);
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
        this.app.logger.error('[tegg/websocket-fetch] handle error: %s', error.stack || error.message);
        return;
      }
      await invokeMethod(controllerMeta.errorMethod, { error });
    };
    const closeHandled = new Promise<void>(resolve => {
      webSocketCtx.socket.once('close', (code, reason) => {
        this.app.ctxStorage.run(eggCtx, async () => {
          try {
            await invokeMethod(controllerMeta.closeMethod, {
              closeCode: code,
              closeReason: reason,
            });
          } catch (error) {
            this.app.logger.error('[tegg/websocket-fetch] handle close failed: %s', error.stack || error.message);
          } finally {
            resolve();
          }
        }).catch(error => {
          this.app.logger.error('[tegg/websocket-fetch] handle close failed: %s', error.stack || error.message);
          resolve();
        });
      });
    });

    webSocketCtx.socket.on('message', data => {
      this.app.ctxStorage.run(eggCtx, async () => {
        try {
          const result = await invokeMethod(methodMeta, { data });
          this.sendFetchResponseStream(result, webSocketCtx.socket, handleError);
        } catch (error) {
          await handleError(error);
        }
      }).catch(error => {
        this.app.logger.error('[tegg/websocket-fetch] handle message failed: %s', error.stack || error.message);
      });
    });
    webSocketCtx.socket.on('error', error => {
      this.app.ctxStorage.run(eggCtx, async () => {
        await handleError(error);
      }).catch(error => {
        this.app.logger.error('[tegg/websocket-fetch] handle socket error failed: %s', error.stack || error.message);
      });
    });

    await invokeMethod(controllerMeta.connectionMethod);
    await invokeMethod(controllerMeta.openMethod);
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

  private sendFetchResponseStream(
    result: unknown,
    webSocket: WebSocket,
    handleError: (error: Error) => Promise<void>,
  ) {
    if (result === undefined || result === null) {
      return;
    }
    if (!this.isReadableStream(result)) {
      handleError(new Error('WebSocketFetch method must return a readable stream or void')).catch(error => {
        this.app.logger.error('[tegg/websocket-fetch] handle invalid response failed: %s', error.stack || error.message);
      });
      return;
    }
    result.on('data', chunk => {
      this.sendFetchChunk(webSocket, chunk, handleError);
    });
    result.once('error', error => {
      handleError(error).catch(err => {
        this.app.logger.error('[tegg/websocket-fetch] handle stream error failed: %s', err.stack || err.message);
      });
    });
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
        this.app.logger.error('[tegg/websocket-fetch] handle send error failed: %s', err.stack || err.message);
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
