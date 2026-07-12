import assert from 'node:assert';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { ClassUtil } from '@eggjs/tegg-metadata';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { ControllerType, WebSocketFetchMethodType } from '@eggjs/tegg-types';
import { ControllerMetaBuilderFactory } from '../../builder/ControllerMetaBuilderFactory';
import { WebSocketFetchControllerMeta, WebSocketFetchMethodMeta } from '../../model';
import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import { ControllerMetadataUtil } from '../../util/ControllerMetadataUtil';
import { ControllerValidator } from '../../util/validator/ControllerValidator';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';
import { WebSocketFetchControllerMethodMetaBuilder } from './WebSocketFetchControllerMethodMetaBuilder';

export class WebSocketFetchControllerMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  private buildMethods() {
    const methodNames = ObjectUtils.getProperties(this.clazz.prototype);
    const methods: WebSocketFetchMethodMeta[] = [];
    let connectionMethod: WebSocketFetchMethodMeta | undefined;
    let openMethod: WebSocketFetchMethodMeta | undefined;
    let errorMethod: WebSocketFetchMethodMeta | undefined;
    let closeMethod: WebSocketFetchMethodMeta | undefined;

    for (const methodName of methodNames) {
      const builder = new WebSocketFetchControllerMethodMetaBuilder(this.clazz, methodName);
      const methodMeta = builder.build();
      if (!methodMeta) {
        continue;
      }
      switch (methodMeta.methodType) {
        case WebSocketFetchMethodType.DATA: {
          methods.push(methodMeta);
          break;
        }
        case WebSocketFetchMethodType.CONNECTION: {
          this.assertSingleLifecycleMethod(connectionMethod, methodMeta.methodType);
          connectionMethod = methodMeta;
          break;
        }
        case WebSocketFetchMethodType.OPEN: {
          this.assertSingleLifecycleMethod(openMethod, methodMeta.methodType);
          openMethod = methodMeta;
          break;
        }
        case WebSocketFetchMethodType.ERROR: {
          this.assertSingleLifecycleMethod(errorMethod, methodMeta.methodType);
          errorMethod = methodMeta;
          break;
        }
        case WebSocketFetchMethodType.CLOSE: {
          this.assertSingleLifecycleMethod(closeMethod, methodMeta.methodType);
          closeMethod = methodMeta;
          break;
        }
        default:
          assert.fail('never arrive');
      }
    }
    return { methods, connectionMethod, openMethod, errorMethod, closeMethod };
  }

  private assertSingleLifecycleMethod(methodMeta: WebSocketFetchMethodMeta | undefined, methodType: WebSocketFetchMethodType) {
    if (!methodMeta) {
      return;
    }
    const classDesc = ClassUtil.classDescription(this.clazz);
    throw new Error(`build websocket fetch controller ${classDesc} failed: duplicate ${methodType} lifecycle method`);
  }

  build(): WebSocketFetchControllerMeta {
    ControllerValidator.validate(this.clazz);
    const controllerType = ControllerInfoUtil.getControllerType(this.clazz);
    assert(controllerType === ControllerType.WEBSOCKET_FETCH, 'invalid controller type');
    const webSocketPath = WebSocketInfoUtil.getWebSocketPath(this.clazz);
    assert(webSocketPath, `build websocket fetch controller ${ClassUtil.classDescription(this.clazz)} failed: path is required`);
    const middlewares = ControllerInfoUtil.getControllerMiddlewares(this.clazz);
    const { methods, connectionMethod, openMethod, errorMethod, closeMethod } = this.buildMethods();
    assert(methods.length === 1, 'websocket fetch controller must have exactly one @WebSocketFetchMethod');
    const clazzName = this.clazz.name;
    const controllerName = ControllerInfoUtil.getControllerName(this.clazz) || clazzName;
    const property = PrototypeUtil.getProperty(this.clazz);
    const protoName = property!.name as string;
    const hosts = ControllerInfoUtil.getControllerHosts(this.clazz);
    const timeout = ControllerInfoUtil.getControllerTimeout(this.clazz);
    const metadata = new WebSocketFetchControllerMeta(
      clazzName, protoName, controllerName, webSocketPath, middlewares, methods, hosts,
      connectionMethod, openMethod, errorMethod, closeMethod, timeout);
    ControllerMetadataUtil.setControllerMetadata(this.clazz, metadata);
    for (const method of metadata.methods) {
      const realPath = metadata.getMethodRealPath(method);
      if (!realPath.startsWith('/')) {
        const desc = ClassUtil.classDescription(this.clazz);
        throw new Error(`class ${desc} method ${method.name} path ${realPath} not start with /`);
      }
    }
    return metadata;
  }

  static create(clazz: EggProtoImplClass) {
    return new WebSocketFetchControllerMetaBuilder(clazz);
  }
}

ControllerMetaBuilderFactory.registerControllerMetaBuilder(ControllerType.WEBSOCKET_FETCH, WebSocketFetchControllerMetaBuilder.create);
