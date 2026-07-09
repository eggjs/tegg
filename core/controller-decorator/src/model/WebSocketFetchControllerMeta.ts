import path from 'node:path';
import type { ControllerMetadata, EggPrototypeName, MiddlewareFunc } from '@eggjs/tegg-types';
import { ControllerType } from '@eggjs/tegg-types';
import { WebSocketFetchMethodMeta } from './WebSocketFetchMethodMeta';

export class WebSocketFetchControllerMeta implements ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  public readonly type = ControllerType.WEBSOCKET_FETCH;
  public readonly path?: string;
  public readonly middlewares: readonly MiddlewareFunc[];
  public readonly methods: readonly WebSocketFetchMethodMeta[];
  public readonly hosts?: string[];
  public readonly connectionMethod?: WebSocketFetchMethodMeta;
  public readonly openMethod?: WebSocketFetchMethodMeta;
  public readonly errorMethod?: WebSocketFetchMethodMeta;
  public readonly closeMethod?: WebSocketFetchMethodMeta;

  constructor(
    className: string,
    protoName: EggPrototypeName,
    controllerName: string,
    path: string | undefined,
    middlewares: MiddlewareFunc[],
    methods: WebSocketFetchMethodMeta[],
    hosts: string[] | undefined,
    connectionMethod: WebSocketFetchMethodMeta | undefined,
    openMethod: WebSocketFetchMethodMeta | undefined,
    errorMethod: WebSocketFetchMethodMeta | undefined,
    closeMethod: WebSocketFetchMethodMeta | undefined,
  ) {
    this.protoName = protoName;
    this.controllerName = controllerName;
    this.className = className;
    this.path = path;
    this.middlewares = middlewares;
    this.methods = methods;
    this.hosts = hosts;
    this.connectionMethod = connectionMethod;
    this.openMethod = openMethod;
    this.errorMethod = errorMethod;
    this.closeMethod = closeMethod;
  }

  getMethodRealPath(method: WebSocketFetchMethodMeta) {
    if (this.path) {
      return path.posix.join(this.path, method.path);
    }
    return method.path;
  }

  getMethodHosts(method: WebSocketFetchMethodMeta): string[] | undefined {
    if (this.hosts) {
      return this.hosts;
    }
    return method.hosts;
  }

  getMethodName(method: WebSocketFetchMethodMeta) {
    return `WEBSOCKET_FETCH ${this.controllerName}.${method.name}`;
  }

  getMethodMiddlewares(method: WebSocketFetchMethodMeta) {
    if (this.middlewares.length) {
      return [
        ...this.middlewares,
        ...method.middlewares,
      ];
    }
    return [ ...method.middlewares ];
  }
}
