import assert from 'node:assert';
import type { EggProtoImplClass, MiddlewareFunc } from '@eggjs/tegg-types';
import ControllerInfoUtil from '../util/ControllerInfoUtil';
import MethodInfoUtil from '../util/MethodInfoUtil';

export function Middleware(...middlewares: MiddlewareFunc []) {
  function classMiddleware(constructor: EggProtoImplClass) {
    middlewares.forEach(mid => {
      ControllerInfoUtil.addControllerMiddleware(mid, constructor);
    });
  }

  function methodMiddleware(target: any, propertyKey: PropertyKey) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    middlewares.forEach(mid => {
      MethodInfoUtil.addMethodMiddleware(mid, controllerClazz, methodName);
    });
  }

  return function(target: any, propertyKey?: PropertyKey) {
    if (propertyKey === undefined) {
      classMiddleware(target);
    } else {
      methodMiddleware(target, propertyKey);
    }
  };
}
