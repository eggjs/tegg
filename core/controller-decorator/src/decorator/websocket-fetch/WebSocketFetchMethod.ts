import assert from 'node:assert';
import { ControllerType, WebSocketFetchMethodType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, WebSocketFetchMethodParams } from '@eggjs/tegg-types';
import MethodInfoUtil from '../../util/MethodInfoUtil';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

function setWebSocketFetchMethodType(
  target: any,
  propertyKey: PropertyKey,
  methodType: WebSocketFetchMethodType,
) {
  assert(typeof propertyKey === 'string',
    `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
  const controllerClazz = target.constructor as EggProtoImplClass;
  const methodName = propertyKey as string;
  MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.WEBSOCKET_FETCH);
  WebSocketInfoUtil.setWebSocketFetchMethodType(methodType, controllerClazz, methodName);
  return { controllerClazz, methodName };
}

export function WebSocketFetchMethod(param?: WebSocketFetchMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    const { controllerClazz, methodName } = setWebSocketFetchMethodType(
      target,
      propertyKey,
      WebSocketFetchMethodType.DATA,
    );
    WebSocketInfoUtil.setWebSocketMethodPath('', controllerClazz, methodName);
    if (param?.priority !== undefined) {
      WebSocketInfoUtil.setWebSocketMethodPriority(param.priority, controllerClazz, methodName);
    }
  };
}

export function WebSocketFetchOnConnection() {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.CONNECTION);
  };
}

export function WebSocketFetchOnOpen() {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.OPEN);
  };
}

export function WebSocketFetchOnError() {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.ERROR);
  };
}

export function WebSocketFetchOnClose() {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.CLOSE);
  };
}
