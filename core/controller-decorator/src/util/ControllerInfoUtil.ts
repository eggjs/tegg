import {
  CONTROLLER_ACL,
  CONTROLLER_AOP_MIDDLEWARES,
  CONTROLLER_HOST,
  CONTROLLER_MIDDLEWARES,
  CONTROLLER_NAME,
  CONTROLLER_TIMEOUT_METADATA,
  CONTROLLER_TYPE,
  IAdvice,
} from '@eggjs/tegg-types';
import type { ControllerTypeLike, EggProtoImplClass, MiddlewareFunc } from '@eggjs/tegg-types';
import { MetadataUtil } from '@eggjs/core-decorator';

export default class ControllerInfoUtil {
  static addControllerMiddleware(middleware: MiddlewareFunc, clazz: EggProtoImplClass) {
    const middlewares = MetadataUtil.initOwnArrayMetaData<MiddlewareFunc>(CONTROLLER_MIDDLEWARES, clazz, []);
    middlewares.push(middleware);
  }

  static addControllerAopMiddleware(middleware: EggProtoImplClass<IAdvice>, clazz: EggProtoImplClass) {
    const middlewares = MetadataUtil.initOwnArrayMetaData<EggProtoImplClass<IAdvice>>(CONTROLLER_AOP_MIDDLEWARES, clazz, []);
    middlewares.push(middleware);
  }

  static getControllerMiddlewares(clazz: EggProtoImplClass): MiddlewareFunc[] {
    return MetadataUtil.getMetaData(CONTROLLER_MIDDLEWARES, clazz) || [];
  }

  static getControllerAopMiddlewares(clazz: EggProtoImplClass): EggProtoImplClass<IAdvice>[] {
    return MetadataUtil.getMetaData(CONTROLLER_AOP_MIDDLEWARES, clazz) || [];
  }

  static setControllerType(clazz: EggProtoImplClass, controllerType: ControllerTypeLike) {
    MetadataUtil.defineMetaData(CONTROLLER_TYPE, controllerType, clazz);
  }

  static setControllerName(clazz: EggProtoImplClass, controllerName: string) {
    MetadataUtil.defineMetaData(CONTROLLER_NAME, controllerName, clazz);
  }

  static getControllerName(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_NAME, clazz);
  }

  static getControllerType(clazz): ControllerTypeLike | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_TYPE, clazz);
  }

  static setControllerAcl(code: string | undefined, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(CONTROLLER_ACL, code, clazz);
  }

  static hasControllerAcl(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.hasMetaData(CONTROLLER_ACL, clazz);
  }

  static getControllerAcl(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_ACL, clazz);
  }

  static addControllerHosts(hosts: string[], clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(CONTROLLER_HOST, hosts, clazz);
  }

  static getControllerHosts(clazz: EggProtoImplClass): string[] | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_HOST, clazz);
  }

  static setControllerTimeout(timeout: number, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(CONTROLLER_TIMEOUT_METADATA, timeout, clazz);
  }

  static getControllerTimeout(clazz: EggProtoImplClass): number | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_TIMEOUT_METADATA, clazz);
  }
}
