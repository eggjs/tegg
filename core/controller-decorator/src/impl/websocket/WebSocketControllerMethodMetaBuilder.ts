import path from 'node:path';
import { ClassUtil } from '@eggjs/tegg-metadata';
import { WebSocketParamType } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { WebSocketMethodMeta, WebSocketParamMeta, WebSocketParamMetaUtil } from '../../model';
import { MethodValidator } from '../../util/validator/MethodValidator';
import MethodInfoUtil from '../../util/MethodInfoUtil';
import { HTTPPriorityUtil } from '../../util/HTTPPriorityUtil';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

export class WebSocketControllerMethodMetaBuilder {
  private readonly clazz: EggProtoImplClass;
  private readonly methodName: string;

  constructor(clazz: EggProtoImplClass, methodName: string) {
    this.clazz = clazz;
    this.methodName = methodName;
  }

  private checkParamDecorators() {
    const method = this.clazz.prototype[this.methodName];
    const functionLength = method.length;
    const paramIndexList = WebSocketInfoUtil.getParamIndexList(this.clazz, this.methodName);
    const contextIndex = MethodInfoUtil.getMethodContextIndex(this.clazz, this.methodName);
    const hasAnnotationParamCount = typeof contextIndex === 'undefined'
      ? paramIndexList.length
      : paramIndexList.length + 1;
    const maxParamCount = Math.max(functionLength, hasAnnotationParamCount);

    for (let i = 0; i < maxParamCount; ++i) {
      if (i === contextIndex) {
        continue;
      }
      const paramType = WebSocketInfoUtil.getWebSocketMethodParamType(i, this.clazz, this.methodName);
      if (!paramType) {
        const classDesc = ClassUtil.classDescription(this.clazz);
        throw new Error(`${classDesc}:${this.methodName} param ${i} has no websocket param type, Please add @HTTPParam, @HTTPQuery, @HTTPQueries, @HTTPHeaders, @Request, @WebSocketSocket, @WebSocketStream or @Context`);
      }
    }
  }

  private buildParamType(webSocketPath: string): Map<number, WebSocketParamMeta> {
    this.checkParamDecorators();

    const paramTypeMap = new Map<number, WebSocketParamMeta>();
    const paramIndexList = WebSocketInfoUtil.getParamIndexList(this.clazz, this.methodName);
    for (const paramIndex of paramIndexList) {
      const paramType = WebSocketInfoUtil.getWebSocketMethodParamType(paramIndex, this.clazz, this.methodName)!;
      if (this.isFetchOnlyParamType(paramType)) {
        const classDesc = ClassUtil.classDescription(this.clazz);
        throw new Error(`${classDesc}:${this.methodName} param ${paramIndex} is websocket fetch only`);
      }
      const paramName = WebSocketInfoUtil.getWebSocketMethodParamName(paramIndex, this.clazz, this.methodName);
      const paramMeta = WebSocketParamMetaUtil.createParam(paramType, paramName);

      try {
        paramMeta.validate(webSocketPath);
      } catch (e) {
        const classDesc = ClassUtil.classDescription(this.clazz);
        e.message = `build websocket controller ${classDesc} method ${this.methodName} param ${paramName} failed: ${e.message}`;
        throw e;
      }

      paramTypeMap.set(paramIndex, paramMeta);
    }
    return paramTypeMap;
  }

  private isFetchOnlyParamType(paramType: WebSocketParamType) {
    return paramType === WebSocketParamType.DATA ||
      paramType === WebSocketParamType.CLOSE ||
      paramType === WebSocketParamType.ERROR ||
      paramType === WebSocketParamType.CLOSE_CODE ||
      paramType === WebSocketParamType.CLOSE_REASON;
  }

  getPriority() {
    const priority = WebSocketInfoUtil.getWebSocketMethodPriority(this.clazz, this.methodName);
    if (priority !== undefined) {
      return priority;
    }
    const controllerPath = WebSocketInfoUtil.getWebSocketPath(this.clazz);
    const methodPath = WebSocketInfoUtil.getWebSocketMethodPath(this.clazz, this.methodName)!;
    const realPath = controllerPath ? path.posix.join(controllerPath, methodPath) : methodPath;
    const defaultPriority = HTTPPriorityUtil.calcPathPriority(realPath);
    if (defaultPriority > HTTPPriorityUtil.DEFAULT_PRIORITY) {
      throw new Error(`path ${realPath} is too long, should set priority manually`);
    }
    return defaultPriority;
  }

  build(): WebSocketMethodMeta | undefined {
    MethodValidator.validate(this.clazz, this.methodName);
    const controllerType = MethodInfoUtil.getMethodControllerType(this.clazz, this.methodName);
    if (!controllerType) {
      return undefined;
    }
    const parentPath = WebSocketInfoUtil.getWebSocketPath(this.clazz);
    const webSocketPath = WebSocketInfoUtil.getWebSocketMethodPath(this.clazz, this.methodName)!;
    const contextIndex = MethodInfoUtil.getMethodContextIndex(this.clazz, this.methodName);
    const middlewares = MethodInfoUtil.getMethodMiddlewares(this.clazz, this.methodName);
    const hosts = MethodInfoUtil.getMethodHosts(this.clazz, this.methodName);
    const realPath = parentPath
      ? path.posix.join(parentPath, webSocketPath)
      : webSocketPath;
    const paramTypeMap = this.buildParamType(realPath);
    const priority = this.getPriority();
    return new WebSocketMethodMeta(
      this.methodName, webSocketPath, middlewares, contextIndex, paramTypeMap, priority, hosts);
  }
}
