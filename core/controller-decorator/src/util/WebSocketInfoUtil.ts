import { MetadataUtil } from '@eggjs/core-decorator';
import {
  CONTROLLER_WEBSOCKET_METHOD_PARAM_NAME_MAP,
  CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP,
  CONTROLLER_WEBSOCKET_METHOD_PATH_MAP,
  CONTROLLER_WEBSOCKET_METHOD_PRIORITY,
  CONTROLLER_WEBSOCKET_FETCH_METHOD_TYPE_MAP,
  CONTROLLER_WEBSOCKET_PATH,
  HTTPParamType,
  WebSocketParamType,
  type EggProtoImplClass,
  type WebSocketFetchMethodType,
} from '@eggjs/tegg-types';
import { MapUtil } from '@eggjs/tegg-common-util';
import HTTPInfoUtil from './HTTPInfoUtil';

type WebSocketMethodPathMap = Map<string, string>;
type WebSocketMethodParamTypeMap = Map<string, Map<number, WebSocketParamType>>;
type WebSocketMethodParamNameMap = Map<string, Map<number, string>>;
type WebSocketMethodPriorityMap = Map<string, number>;
type WebSocketFetchMethodTypeMap = Map<string, WebSocketFetchMethodType>;

export default class WebSocketInfoUtil {
  static setWebSocketPath(path: string, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(CONTROLLER_WEBSOCKET_PATH, path, clazz);
  }

  static getWebSocketPath(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_PATH, clazz);
  }

  static setWebSocketMethodPath(path: string, clazz: EggProtoImplClass, methodName: string) {
    const methodPathMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_WEBSOCKET_METHOD_PATH_MAP, clazz, new Map());
    methodPathMap.set(methodName, path);
  }

  static getWebSocketMethodPath(clazz: EggProtoImplClass, methodName: string): string | undefined {
    const methodPathMap: WebSocketMethodPathMap | undefined = MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_METHOD_PATH_MAP, clazz);
    return methodPathMap?.get(methodName);
  }

  static setWebSocketMethodParamType(paramType: WebSocketParamType, parameterIndex: number, clazz: EggProtoImplClass, methodName: string) {
    const methodParamMap: WebSocketMethodParamTypeMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP, clazz, new Map());
    const paramMap = MapUtil.getOrStore(methodParamMap, methodName, new Map());
    paramMap.set(parameterIndex, paramType);
  }

  static getParamIndexList(clazz: EggProtoImplClass, methodName: string): number[] {
    const methodParamMap: WebSocketMethodParamTypeMap | undefined = MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP, clazz);
    const paramMap = methodParamMap?.get(methodName);
    if (!paramMap) {
      return [];
    }
    return Array.from(paramMap.keys());
  }

  static getCompatibleParamIndexList(clazz: EggProtoImplClass, methodName: string): number[] {
    return Array.from(new Set([
      ...this.getParamIndexList(clazz, methodName),
      ...HTTPInfoUtil.getParamIndexList(clazz, methodName),
    ]));
  }

  static getWebSocketMethodParamType(parameterIndex: number, clazz: EggProtoImplClass, methodName: string): WebSocketParamType | undefined {
    const methodParamMap: WebSocketMethodParamTypeMap | undefined = MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP, clazz);
    const paramMap = methodParamMap?.get(methodName);
    return paramMap?.get(parameterIndex);
  }

  static getCompatibleMethodParamType(parameterIndex: number, clazz: EggProtoImplClass, methodName: string): WebSocketParamType | undefined {
    return this.getWebSocketMethodParamType(parameterIndex, clazz, methodName) ??
      this.fromHTTPParamType(HTTPInfoUtil.getHTTPMethodParamType(parameterIndex, clazz, methodName));
  }

  static setWebSocketMethodParamName(paramName: string, parameterIndex: number, clazz: EggProtoImplClass, methodName: string) {
    const methodParamNameMap: WebSocketMethodParamNameMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_WEBSOCKET_METHOD_PARAM_NAME_MAP, clazz, new Map());
    const paramMap = MapUtil.getOrStore(methodParamNameMap, methodName, new Map());
    paramMap.set(parameterIndex, paramName);
  }

  static getWebSocketMethodParamName(parameterIndex: number, clazz: EggProtoImplClass, methodName: string): string | undefined {
    const methodParamNameMap: WebSocketMethodParamNameMap | undefined = MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_METHOD_PARAM_NAME_MAP, clazz);
    const paramMap = methodParamNameMap?.get(methodName);
    return paramMap?.get(parameterIndex);
  }

  static getCompatibleMethodParamName(parameterIndex: number, clazz: EggProtoImplClass, methodName: string): string | undefined {
    return this.getWebSocketMethodParamName(parameterIndex, clazz, methodName) ??
      HTTPInfoUtil.getHTTPMethodParamName(parameterIndex, clazz, methodName);
  }

  static getWebSocketMethodPriority(clazz: EggProtoImplClass, methodName: string): number | undefined {
    const methodPriorityMap: WebSocketMethodPriorityMap | undefined = MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_METHOD_PRIORITY, clazz);
    return methodPriorityMap?.get(methodName);
  }

  static setWebSocketMethodPriority(priority: number, clazz: EggProtoImplClass, methodName: string) {
    const methodPriorityMap: WebSocketMethodPriorityMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_WEBSOCKET_METHOD_PRIORITY, clazz, new Map());
    methodPriorityMap.set(methodName, priority);
  }

  static setWebSocketFetchMethodType(type: WebSocketFetchMethodType, clazz: EggProtoImplClass, methodName: string) {
    const methodTypeMap: WebSocketFetchMethodTypeMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_WEBSOCKET_FETCH_METHOD_TYPE_MAP, clazz, new Map());
    methodTypeMap.set(methodName, type);
  }

  static getWebSocketFetchMethodType(clazz: EggProtoImplClass, methodName: string): WebSocketFetchMethodType | undefined {
    const methodTypeMap: WebSocketFetchMethodTypeMap | undefined = MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_FETCH_METHOD_TYPE_MAP, clazz);
    return methodTypeMap?.get(methodName);
  }

  private static fromHTTPParamType(paramType: HTTPParamType | undefined): WebSocketParamType | undefined {
    switch (paramType) {
      case HTTPParamType.PARAM:
        return WebSocketParamType.PARAM;
      case HTTPParamType.QUERY:
        return WebSocketParamType.QUERY;
      case HTTPParamType.QUERIES:
        return WebSocketParamType.QUERIES;
      case HTTPParamType.HEADERS:
        return WebSocketParamType.HEADERS;
      case HTTPParamType.REQUEST:
        return WebSocketParamType.REQUEST;
      default:
        return undefined;
    }
  }
}
