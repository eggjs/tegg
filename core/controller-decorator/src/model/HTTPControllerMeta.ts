import path from 'node:path';
import type { ControllerMetadata, EggPrototypeName, MiddlewareFunc } from '@eggjs/tegg-types';
import { ControllerType } from '@eggjs/tegg-types';
import { HTTPMethodMeta } from './HTTPMethodMeta';

export class HTTPControllerMeta implements ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  public readonly type = ControllerType.HTTP;
  public readonly path?: string;
  public readonly middlewares: readonly MiddlewareFunc[];
  public readonly methods: readonly HTTPMethodMeta[];
  public readonly needAcl: boolean;
  public readonly aclCode?: string;
  public readonly hosts?: string[];
  public readonly timeout?: number;

  constructor(
    className: string,
    protoName: EggPrototypeName,
    controllerName: string,
    path: string | undefined,
    middlewares: MiddlewareFunc[],
    methods: HTTPMethodMeta[],
    needAcl: boolean,
    aclCode: string | undefined,
    hosts: string[] | undefined,
    timeout: number | undefined,
  ) {
    this.protoName = protoName;
    this.controllerName = controllerName;
    this.className = className;
    this.path = path;
    this.middlewares = middlewares;
    this.methods = methods;
    this.needAcl = needAcl;
    this.aclCode = aclCode;
    this.hosts = hosts;
    this.timeout = timeout;
  }

  getMethodRealPath(method: HTTPMethodMeta) {
    if (this.path) {
      return path.posix.join(this.path, method.path);
    }
    return method.path;
  }

  getMethodHosts(method: HTTPMethodMeta): string[] | undefined {
    if (this.hosts) {
      return this.hosts;
    }
    return method.hosts;
  }

  getMethodName(method: HTTPMethodMeta) {
    return `${method.method} ${this.controllerName}.${method.name}`;
  }

  getMethodMiddlewares(method: HTTPMethodMeta) {
    if (this.middlewares.length) {
      return [
        ...this.middlewares,
        ...method.middlewares,
      ];
    }
    return [ ...method.middlewares ];
  }

  hasMethodAcl(method: HTTPMethodMeta): boolean {
    return method.needAcl || this.needAcl;
  }

  getMethodAcl(method: HTTPMethodMeta): string | undefined {
    if (method.aclCode) {
      return method.aclCode;
    }
    return this.aclCode;
  }

  getMethodTimeout(method: HTTPMethodMeta): number | undefined {
    return method.timeout || this.timeout;
  }
}
