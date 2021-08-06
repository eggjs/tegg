import { ControllerTypeLike, MiddlewareFunc } from '../model';
import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';

export const CONTROLLER_TYPE = Symbol.for('EggPrototype#controllerType');
export const CONTROLLER_NAME = Symbol.for('EggPrototype#controllerName');
export const CONTROLLER_MIDDLEWARES = Symbol.for('EggPrototype#controller#middlewares');
export const CONTROLLER_ACL = Symbol.for('EggPrototype#controller#acl');

export default class ControllerInfoUtil {
  static addControllerMiddleware(middleware: MiddlewareFunc, clazz: EggProtoImplClass) {
    const middlewares = MetadataUtil.initOwnArrayMetaData<MiddlewareFunc>(CONTROLLER_MIDDLEWARES, clazz, []);
    middlewares.push(middleware);
  }

  static getControllerMiddlewares(clazz: EggProtoImplClass): MiddlewareFunc[] {
    return MetadataUtil.getMetaData(CONTROLLER_MIDDLEWARES, clazz) || [];
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
}
