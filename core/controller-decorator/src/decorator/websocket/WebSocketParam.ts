import assert from 'node:assert';
import { WebSocketParamType } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

export function WebSocketSocket() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    WebSocketInfoUtil.setWebSocketMethodParamType(WebSocketParamType.SOCKET, parameterIndex, controllerClazz, methodName);
  };
}

export function WebSocketStream() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    WebSocketInfoUtil.setWebSocketMethodParamType(WebSocketParamType.STREAM, parameterIndex, controllerClazz, methodName);
  };
}
