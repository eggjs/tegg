import assert from 'node:assert';
import { WebSocketParamType } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

function setWebSocketFetchParamType(
  target: any,
  propertyKey: PropertyKey,
  parameterIndex: number,
  paramType: WebSocketParamType,
) {
  assert(typeof propertyKey === 'string',
    `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
  const methodName = propertyKey as string;
  const controllerClazz = target.constructor as EggProtoImplClass;
  WebSocketInfoUtil.setWebSocketMethodParamType(paramType, parameterIndex, controllerClazz, methodName);
}

export function WebSocketData() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    setWebSocketFetchParamType(target, propertyKey, parameterIndex, WebSocketParamType.DATA);
  };
}

export function WebSocketClose() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    setWebSocketFetchParamType(target, propertyKey, parameterIndex, WebSocketParamType.CLOSE);
  };
}

export function WebSocketError() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    setWebSocketFetchParamType(target, propertyKey, parameterIndex, WebSocketParamType.ERROR);
  };
}

export function WebSocketCloseCode() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    setWebSocketFetchParamType(target, propertyKey, parameterIndex, WebSocketParamType.CLOSE_CODE);
  };
}

export function WebSocketCloseReason() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    setWebSocketFetchParamType(target, propertyKey, parameterIndex, WebSocketParamType.CLOSE_REASON);
  };
}
