import { MetadataUtil } from '@eggjs/core-decorator';
import {
  CONTROLLER_WEBSOCKET_METHOD_PARAM_NAME_MAP,
  CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP,
  CONTROLLER_WEBSOCKET_METHOD_PATH_MAP,
  CONTROLLER_WEBSOCKET_METHOD_PRIORITY,
  CONTROLLER_WEBSOCKET_FETCH_METHOD_TYPE_MAP,
  CONTROLLER_WEBSOCKET_PATH,
} from '@eggjs/tegg-types';
import type { EggProtoImplClass, WebSocketFetchMethodType, WebSocketParamType } from '@eggjs/tegg-types';
import { MapUtil } from '@eggjs/tegg-common-util';

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

  static getWebSocketMethodParamType(parameterIndex: number, clazz: EggProtoImplClass, methodName: string): WebSocketParamType | undefined {
    const methodParamMap: WebSocketMethodParamTypeMap | undefined = MetadataUtil.getMetaData(CONTROLLER_WEBSOCKET_METHOD_PARAM_TYPE_MAP, clazz);
    const paramMap = methodParamMap?.get(methodName);
    return paramMap?.get(parameterIndex);
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
}
