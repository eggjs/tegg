import assert from 'node:assert';
import { HTTPParamType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, HTTPParamParams, HTTPQueriesParams, HTTPQueryParams } from '@eggjs/tegg-types';
import HTTPInfoUtil from '../../util/HTTPInfoUtil';
import { ObjectUtils } from '@eggjs/tegg-common-util';

// TODO url params
// /foo/:id
// refactor HTTPQuery, HTTPBody, HTTPParam

export function HTTPBody() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.BODY, parameterIndex, controllerClazz, methodName);
  };
}

export function HTTPHeaders() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.HEADERS, parameterIndex, controllerClazz, methodName);
  };
}

export function HTTPQuery(param?: HTTPQueryParams) {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.QUERY, parameterIndex, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

export function HTTPQueries(param?: HTTPQueriesParams) {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.QUERIES, parameterIndex, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

export function HTTPParam(param?: HTTPParamParams) {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.PARAM, parameterIndex, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

export function Request() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    const [ nodeMajor ] = process.versions.node.split('.').map(v => Number(v));
    assert(nodeMajor >= 16,
      `[controller/${target.name}] expect node version >=16, but now is ${nodeMajor}`);
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.REQUEST, parameterIndex, controllerClazz, methodName);
  };
}

export function Cookies() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.COOKIES, parameterIndex, controllerClazz, methodName);
  };
}
