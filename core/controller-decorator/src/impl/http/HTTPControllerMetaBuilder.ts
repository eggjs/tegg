import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import assert from 'assert';
import HTTPInfoUtil from '../../util/HTTPInfoUtil';
import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import { ControllerType, HTTPControllerMeta, HTTPMethodMeta } from '../../model';
import { ControllerValidator } from '../../util/validator/ControllerValidator';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { HTTPControllerMethodMetaBuilder } from './HTTPControllerMethodMetaBuilder';
import { ClassUtil } from '@eggjs/tegg-metadata';
import { ControllerMetaBuilderFactory } from '../../builder/ControllerMetaBuilderFactory';
import { ControllerMetadataUtil } from '../../util/ControllerMetadataUtil';

export class HTTPControllerMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  private buildMethod(): HTTPMethodMeta[] {
    const methodNames = ObjectUtils.getProperties(this.clazz.prototype);
    const methods: HTTPMethodMeta[] = [];
    for (const methodName of methodNames) {
      const builder = new HTTPControllerMethodMetaBuilder(this.clazz, methodName);
      const methodMeta = builder.build();
      if (methodMeta) {
        methods.push(methodMeta);
      }
    }
    return methods;
  }

  build(): HTTPControllerMeta {
    ControllerValidator.validate(this.clazz);
    const controllerType = ControllerInfoUtil.getControllerType(this.clazz);
    assert(controllerType === ControllerType.HTTP, 'invalidate controller type');
    const httpPath = HTTPInfoUtil.getHTTPPath(this.clazz);
    const httpMiddlewares = ControllerInfoUtil.getControllerMiddlewares(this.clazz);
    const methods = this.buildMethod();
    const clazzName = this.clazz.name;
    const controllerName = ControllerInfoUtil.getControllerName(this.clazz) || clazzName;
    const property = PrototypeUtil.getProperty(this.clazz);
    const protoName = property!.name as string;
    const needAcl = ControllerInfoUtil.hasControllerAcl(this.clazz);
    const aclCode = ControllerInfoUtil.getControllerAcl(this.clazz);
    const hosts = ControllerInfoUtil.getControllerHosts(this.clazz);
    const metadata = new HTTPControllerMeta(
      clazzName, protoName, controllerName, httpPath, httpMiddlewares, methods, needAcl, aclCode, hosts);
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
    return new HTTPControllerMetaBuilder(clazz);
  }
}

ControllerMetaBuilderFactory.registerControllerMetaBuilder(ControllerType.HTTP, HTTPControllerMetaBuilder.create);
