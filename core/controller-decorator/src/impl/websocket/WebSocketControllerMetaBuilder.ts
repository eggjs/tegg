import assert from 'node:assert';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { ClassUtil } from '@eggjs/tegg-metadata';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { ControllerType } from '@eggjs/tegg-types';
import { ControllerMetaBuilderFactory } from '../../builder/ControllerMetaBuilderFactory';
import { WebSocketControllerMeta, WebSocketMethodMeta } from '../../model';
import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import { ControllerMetadataUtil } from '../../util/ControllerMetadataUtil';
import { ControllerValidator } from '../../util/validator/ControllerValidator';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';
import { WebSocketControllerMethodMetaBuilder } from './WebSocketControllerMethodMetaBuilder';

export class WebSocketControllerMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  private buildMethod(): WebSocketMethodMeta[] {
    const methodNames = ObjectUtils.getProperties(this.clazz.prototype);
    const methods: WebSocketMethodMeta[] = [];
    for (const methodName of methodNames) {
      const builder = new WebSocketControllerMethodMetaBuilder(this.clazz, methodName);
      const methodMeta = builder.build();
      if (methodMeta) {
        methods.push(methodMeta);
      }
    }
    return methods;
  }

  build(): WebSocketControllerMeta {
    ControllerValidator.validate(this.clazz);
    const controllerType = ControllerInfoUtil.getControllerType(this.clazz);
    assert(controllerType === ControllerType.WEBSOCKET, 'invalidate controller type');
    const webSocketPath = WebSocketInfoUtil.getWebSocketPath(this.clazz);
    const middlewares = ControllerInfoUtil.getControllerMiddlewares(this.clazz);
    const methods = this.buildMethod();
    const clazzName = this.clazz.name;
    const controllerName = ControllerInfoUtil.getControllerName(this.clazz) || clazzName;
    const property = PrototypeUtil.getProperty(this.clazz);
    const protoName = property!.name as string;
    const hosts = ControllerInfoUtil.getControllerHosts(this.clazz);
    const metadata = new WebSocketControllerMeta(
      clazzName, protoName, controllerName, webSocketPath, middlewares, methods, hosts);
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
    return new WebSocketControllerMetaBuilder(clazz);
  }
}

ControllerMetaBuilderFactory.registerControllerMetaBuilder(ControllerType.WEBSOCKET, WebSocketControllerMetaBuilder.create);
