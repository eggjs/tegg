import path from 'node:path';
import type { ControllerMetadata, EggPrototypeName, MiddlewareFunc } from '@eggjs/tegg-types';
import { ControllerType } from '@eggjs/tegg-types';
import { WebSocketMethodMeta } from './WebSocketMethodMeta';

export class WebSocketControllerMeta implements ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  public readonly type = ControllerType.WEBSOCKET;
  public readonly path?: string;
  public readonly middlewares: readonly MiddlewareFunc[];
  public readonly methods: readonly WebSocketMethodMeta[];
  public readonly hosts?: string[];

  constructor(
    className: string,
    protoName: EggPrototypeName,
    controllerName: string,
    path: string | undefined,
    middlewares: MiddlewareFunc[],
    methods: WebSocketMethodMeta[],
    hosts: string[] | undefined,
  ) {
    this.protoName = protoName;
    this.controllerName = controllerName;
    this.className = className;
    this.path = path;
    this.middlewares = middlewares;
    this.methods = methods;
    this.hosts = hosts;
  }

  getMethodRealPath(method: WebSocketMethodMeta) {
    if (this.path) {
      return path.posix.join(this.path, method.path);
    }
    return method.path;
  }

  getMethodHosts(method: WebSocketMethodMeta): string[] | undefined {
    if (this.hosts) {
      return this.hosts;
    }
    return method.hosts;
  }

  getMethodName(method: WebSocketMethodMeta) {
    return `WEBSOCKET ${this.controllerName}.${method.name}`;
  }

  getMethodMiddlewares(method: WebSocketMethodMeta) {
    if (this.middlewares.length) {
      return [
        ...this.middlewares,
        ...method.middlewares,
      ];
    }
    return [ ...method.middlewares ];
  }
}
