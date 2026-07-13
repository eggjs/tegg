import assert from 'node:assert';
import { ControllerType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, WebSocketMethodParams } from '@eggjs/tegg-types';
import MethodInfoUtil from '../../util/MethodInfoUtil';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

export function WebSocketMethod(param: WebSocketMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.WEBSOCKET);
    WebSocketInfoUtil.setWebSocketMethodPath(param.path, controllerClazz, methodName);
    if (param.priority !== undefined) {
      WebSocketInfoUtil.setWebSocketMethodPriority(param.priority, controllerClazz, methodName);
    }
    if (param.timeout !== undefined) {
      MethodInfoUtil.setMethodTimeout(param.timeout, controllerClazz, methodName);
    }
  };
}
