import path from 'path';
import { ControllerMetadata } from './ControllerMetadata';
import { ControllerType, HostType, MiddlewareFunc } from './types';
import { HTTPMethodMeta } from './HTTPMethodMeta';
import { EggPrototypeName } from '@eggjs/core-decorator';

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
  public readonly host?: HostType;

  constructor(
    className: string,
    protoName: EggPrototypeName,
    controllerName: string,
    path: string | undefined,
    middlewares: MiddlewareFunc[],
    methods: HTTPMethodMeta[],
    needAcl: boolean,
    aclCode: string | undefined,
    host: HostType | undefined,
  ) {
    this.protoName = protoName;
    this.controllerName = controllerName;
    this.className = className;
    this.path = path;
    this.middlewares = middlewares;
    this.methods = methods;
    this.needAcl = needAcl;
    this.aclCode = aclCode;
    this.host = host;
  }

  getMethodRealPath(method: HTTPMethodMeta) {
    if (this.path) {
      return path.posix.join(this.path, method.path);
    }
    return method.path;
  }

  getMethodHost(method: HTTPMethodMeta): HostType | undefined {
    if (this.host) {
      return this.host;
    }
    return method.host;
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
    return method.needAcL || this.needAcl;
  }

  getMethodAcl(method: HTTPMethodMeta): string | undefined {
    if (method.aclCode) {
      return method.aclCode;
    }
    return this.aclCode;
  }
}
