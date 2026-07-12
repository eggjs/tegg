import assert from 'node:assert';
import { ControllerType, WebSocketFetchMethodType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, WebSocketFetchLifecycleMethodParams, WebSocketFetchMethodParams } from '@eggjs/tegg-types';
import MethodInfoUtil from '../../util/MethodInfoUtil';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

function setWebSocketFetchMethodType(
  target: any,
  propertyKey: PropertyKey,
  methodType: WebSocketFetchMethodType,
  timeout?: number,
) {
  assert(typeof propertyKey === 'string',
    `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
  const controllerClazz = target.constructor as EggProtoImplClass;
  const methodName = propertyKey as string;
  MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.WEBSOCKET_FETCH);
  WebSocketInfoUtil.setWebSocketFetchMethodType(methodType, controllerClazz, methodName);
  if (timeout !== undefined) {
    MethodInfoUtil.setMethodTimeout(timeout, controllerClazz, methodName);
  }
  return { controllerClazz, methodName };
}

export function WebSocketFetchMethod(param?: WebSocketFetchMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    const { controllerClazz, methodName } = setWebSocketFetchMethodType(
      target,
      propertyKey,
      WebSocketFetchMethodType.DATA,
      param?.timeout,
    );
    WebSocketInfoUtil.setWebSocketMethodPath('', controllerClazz, methodName);
    if (param?.priority !== undefined) {
      WebSocketInfoUtil.setWebSocketMethodPriority(param.priority, controllerClazz, methodName);
    }
  };
}

export function WebSocketFetchOnConnection(param?: WebSocketFetchLifecycleMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.CONNECTION, param?.timeout);
  };
}

export function WebSocketFetchOnOpen(param?: WebSocketFetchLifecycleMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.OPEN, param?.timeout);
  };
}

export function WebSocketFetchOnError(param?: WebSocketFetchLifecycleMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.ERROR, param?.timeout);
  };
}

export function WebSocketFetchOnClose(param?: WebSocketFetchLifecycleMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    setWebSocketFetchMethodType(target, propertyKey, WebSocketFetchMethodType.CLOSE, param?.timeout);
  };
}
