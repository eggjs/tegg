import path from 'node:path';
import { ClassUtil } from '@eggjs/tegg-metadata';
import { ControllerType, WebSocketFetchMethodType, WebSocketParamType } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { WebSocketFetchMethodMeta, WebSocketParamMeta, WebSocketParamMetaUtil } from '../../model';
import { MethodValidator } from '../../util/validator/MethodValidator';
import MethodInfoUtil from '../../util/MethodInfoUtil';
import { HTTPPriorityUtil } from '../../util/HTTPPriorityUtil';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

export class WebSocketFetchControllerMethodMetaBuilder {
  private readonly clazz: EggProtoImplClass;
  private readonly methodName: string;

  constructor(clazz: EggProtoImplClass, methodName: string) {
    this.clazz = clazz;
    this.methodName = methodName;
  }

  private checkParamDecorators(methodType: WebSocketFetchMethodType) {
    const method = this.clazz.prototype[this.methodName];
    const functionLength = method.length;
    const paramIndexList = WebSocketInfoUtil.getCompatibleParamIndexList(this.clazz, this.methodName);
    const contextIndex = MethodInfoUtil.getMethodContextIndex(this.clazz, this.methodName);
    const hasAnnotationParamCount = typeof contextIndex === 'undefined'
      ? paramIndexList.length
      : paramIndexList.length + 1;
    const maxParamCount = Math.max(functionLength, hasAnnotationParamCount);

    for (let i = 0; i < maxParamCount; ++i) {
      if (i === contextIndex) {
        continue;
      }
      const paramType = WebSocketInfoUtil.getCompatibleMethodParamType(i, this.clazz, this.methodName);
      if (!paramType) {
        const classDesc = ClassUtil.classDescription(this.clazz);
        throw new Error(`${classDesc}:${this.methodName} param ${i} has no websocket fetch param type, Please add @WebSocketData, @WebSocketClose, @WebSocketError, @WebSocketCloseCode, @WebSocketCloseReason, @HTTPParam, @HTTPQuery, @HTTPQueries, @HTTPHeaders, @Request, @WebSocketSocket or @Context`);
      }
      if (!this.isAllowedParamType(methodType, paramType)) {
        const classDesc = ClassUtil.classDescription(this.clazz);
        throw new Error(`${classDesc}:${this.methodName} param ${i} type ${paramType} is not allowed in websocket fetch ${methodType} method`);
      }
    }
  }

  private isAllowedParamType(methodType: WebSocketFetchMethodType, paramType: WebSocketParamType) {
    if (paramType === WebSocketParamType.STREAM) {
      return false;
    }
    if (this.isCommonParamType(paramType)) {
      return true;
    }
    if (paramType === WebSocketParamType.CLOSE) {
      return methodType !== WebSocketFetchMethodType.CLOSE;
    }
    switch (methodType) {
      case WebSocketFetchMethodType.DATA: {
        return paramType === WebSocketParamType.DATA;
      }
      case WebSocketFetchMethodType.ERROR: {
        return paramType === WebSocketParamType.ERROR;
      }
      case WebSocketFetchMethodType.CLOSE: {
        return paramType === WebSocketParamType.CLOSE_CODE ||
          paramType === WebSocketParamType.CLOSE_REASON;
      }
      case WebSocketFetchMethodType.CONNECTION:
      case WebSocketFetchMethodType.OPEN: {
        return false;
      }
      default:
        return false;
    }
  }

  private isCommonParamType(paramType: WebSocketParamType) {
    return paramType === WebSocketParamType.PARAM ||
      paramType === WebSocketParamType.QUERY ||
      paramType === WebSocketParamType.QUERIES ||
      paramType === WebSocketParamType.HEADERS ||
      paramType === WebSocketParamType.REQUEST ||
      paramType === WebSocketParamType.SOCKET;
  }

  private buildParamType(webSocketPath: string, methodType: WebSocketFetchMethodType): Map<number, WebSocketParamMeta> {
    this.checkParamDecorators(methodType);

    const paramTypeMap = new Map<number, WebSocketParamMeta>();
    const paramIndexList = WebSocketInfoUtil.getCompatibleParamIndexList(this.clazz, this.methodName);
    for (const paramIndex of paramIndexList) {
      const paramType = WebSocketInfoUtil.getCompatibleMethodParamType(paramIndex, this.clazz, this.methodName)!;
      const paramName = WebSocketInfoUtil.getCompatibleMethodParamName(paramIndex, this.clazz, this.methodName);
      const paramMeta = WebSocketParamMetaUtil.createParam(paramType, paramName);

      if (methodType === WebSocketFetchMethodType.DATA) {
        try {
          paramMeta.validate(webSocketPath);
        } catch (e) {
          const classDesc = ClassUtil.classDescription(this.clazz);
          e.message = `build websocket fetch controller ${classDesc} method ${this.methodName} param ${paramName} failed: ${e.message}`;
          throw e;
        }
      }

      paramTypeMap.set(paramIndex, paramMeta);
    }
    return paramTypeMap;
  }

  getPriority() {
    const priority = WebSocketInfoUtil.getWebSocketMethodPriority(this.clazz, this.methodName);
    if (priority !== undefined) {
      return priority;
    }
    const controllerPath = WebSocketInfoUtil.getWebSocketPath(this.clazz);
    const methodPath = WebSocketInfoUtil.getWebSocketMethodPath(this.clazz, this.methodName) || '';
    const realPath = controllerPath ? path.posix.join(controllerPath, methodPath) : methodPath;
    const defaultPriority = HTTPPriorityUtil.calcPathPriority(realPath);
    if (defaultPriority > HTTPPriorityUtil.DEFAULT_PRIORITY) {
      throw new Error(`path ${realPath} is too long, should set priority manually`);
    }
    return defaultPriority;
  }

  build(): WebSocketFetchMethodMeta | undefined {
    MethodValidator.validate(this.clazz, this.methodName);
    const controllerType = MethodInfoUtil.getMethodControllerType(this.clazz, this.methodName);
    if (!controllerType || controllerType !== ControllerType.WEBSOCKET_FETCH) {
      return undefined;
    }
    const methodType = WebSocketInfoUtil.getWebSocketFetchMethodType(this.clazz, this.methodName);
    if (!methodType) {
      return undefined;
    }
    const parentPath = WebSocketInfoUtil.getWebSocketPath(this.clazz);
    const webSocketPath = methodType === WebSocketFetchMethodType.DATA
      ? WebSocketInfoUtil.getWebSocketMethodPath(this.clazz, this.methodName) || ''
      : '';
    const contextIndex = MethodInfoUtil.getMethodContextIndex(this.clazz, this.methodName);
    const middlewares = MethodInfoUtil.getMethodMiddlewares(this.clazz, this.methodName);
    const hosts = MethodInfoUtil.getMethodHosts(this.clazz, this.methodName);
    const realPath = parentPath
      ? path.posix.join(parentPath, webSocketPath)
      : webSocketPath;
    const paramTypeMap = this.buildParamType(realPath, methodType);
    const priority = methodType === WebSocketFetchMethodType.DATA ? this.getPriority() : HTTPPriorityUtil.DEFAULT_PRIORITY;
    const timeout = MethodInfoUtil.getMethodTimeout(this.clazz, this.methodName);
    return new WebSocketFetchMethodMeta(
      this.methodName, webSocketPath, middlewares, contextIndex, paramTypeMap, priority, hosts, methodType, timeout);
  }
}
