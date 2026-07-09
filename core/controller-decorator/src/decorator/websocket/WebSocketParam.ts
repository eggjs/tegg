import assert from 'node:assert';
import { WebSocketParamType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, WebSocketParamParams, WebSocketQueriesParams, WebSocketQueryParams } from '@eggjs/tegg-types';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

export function WebSocketHeaders() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    WebSocketInfoUtil.setWebSocketMethodParamType(WebSocketParamType.HEADERS, parameterIndex, controllerClazz, methodName);
  };
}

export function WebSocketQuery(param?: WebSocketQueryParams) {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    WebSocketInfoUtil.setWebSocketMethodParamType(WebSocketParamType.QUERY, parameterIndex, controllerClazz, methodName);
    WebSocketInfoUtil.setWebSocketMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

export function WebSocketQueries(param?: WebSocketQueriesParams) {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    WebSocketInfoUtil.setWebSocketMethodParamType(WebSocketParamType.QUERIES, parameterIndex, controllerClazz, methodName);
    WebSocketInfoUtil.setWebSocketMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

export function WebSocketParam(param?: WebSocketParamParams) {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    WebSocketInfoUtil.setWebSocketMethodParamType(WebSocketParamType.PARAM, parameterIndex, controllerClazz, methodName);
    WebSocketInfoUtil.setWebSocketMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

export function WebSocketRequest() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    WebSocketInfoUtil.setWebSocketMethodParamType(WebSocketParamType.REQUEST, parameterIndex, controllerClazz, methodName);
  };
}

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
