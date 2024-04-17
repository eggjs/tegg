import assert from 'node:assert';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import MethodInfoUtil from '../util/MethodInfoUtil';

export function Context() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    MethodInfoUtil.setMethodContextIndexInArgs(parameterIndex, controllerClazz, methodName);
  };
}
