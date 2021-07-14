import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { ControllerTypeLike, MiddlewareFunc } from '../model';
import { MapUtil } from '@eggjs/tegg-common-util';

const METHOD_CONTROLLER_TYPE_MAP = Symbol.for('EggPrototype#controller#mthods');
const METHOD_CONTEXT_INDEX = Symbol.for('EggPrototype#controller#method#context');
const METHOD_MIDDLEWARES = Symbol.for('EggPrototype#method#middlewares');
const METHOD_ACL = Symbol.for('EggPrototype#method#acl');

type METHOD_MAP = Map<string, ControllerTypeLike>;
type MethodContextIndexMap = Map<string, number>;
type MethodMiddlewareMap = Map<string, MiddlewareFunc[]>;
type MethodAclMap = Map<string, string | undefined>;

export default class MethodInfoUtil {
  static setMethodControllerType(clazz: EggProtoImplClass, methodName: string, controllerType: ControllerTypeLike) {
    const methodControllerMap: METHOD_MAP = MetadataUtil.initOwnMapMetaData(METHOD_CONTROLLER_TYPE_MAP, clazz, new Map());
    methodControllerMap.set(methodName, controllerType);
  }

  static getMethodControllerType(clazz: EggProtoImplClass, methodName: string): ControllerTypeLike | undefined {
    const methodControllerMap: METHOD_MAP | undefined = MetadataUtil.getMetaData(METHOD_CONTROLLER_TYPE_MAP, clazz);
    return methodControllerMap?.get(methodName);
  }

  static setMethodContextIndexInArgs(index: number, clazz: EggProtoImplClass, methodName: string) {
    const methodContextIndexMap: MethodContextIndexMap = MetadataUtil.initOwnMapMetaData(METHOD_CONTEXT_INDEX, clazz, new Map());
    methodContextIndexMap.set(methodName, index);
  }

  static getMethodContextIndex(clazz: EggProtoImplClass, methodName: string): number | undefined {
    const methodContextIndexMap: MethodContextIndexMap | undefined = MetadataUtil.getMetaData(METHOD_CONTEXT_INDEX, clazz);
    return methodContextIndexMap?.get(methodName);
  }

  static addMethodMiddleware(middleware: MiddlewareFunc, clazz: EggProtoImplClass, methodName: string) {
    const methodMiddlewareMap: MethodMiddlewareMap = MetadataUtil.initOwnMapMetaData(METHOD_MIDDLEWARES, clazz, new Map());
    const methodMiddlewares = MapUtil.getOrStore(methodMiddlewareMap, methodName, []);
    methodMiddlewares.push(middleware);
  }

  static getMethodMiddlewares(clazz: EggProtoImplClass, methodName: string): MiddlewareFunc[] {
    const methodMiddlewareMap: MethodMiddlewareMap | undefined = MetadataUtil.getMetaData(METHOD_MIDDLEWARES, clazz);
    return methodMiddlewareMap?.get(methodName) || [];
  }

  static setMethodAcl(code: string | undefined, clazz: EggProtoImplClass, methodName: string) {
    const methodAclMap: MethodAclMap = MetadataUtil.initOwnMapMetaData(METHOD_ACL, clazz, new Map());
    methodAclMap.set(methodName, code);
  }

  static hasMethodAcl(clazz: EggProtoImplClass, methodName: string): boolean {
    const methodAclMap: MethodAclMap | undefined = MetadataUtil.getMetaData(METHOD_ACL, clazz);
    return !!methodAclMap?.has(methodName);
  }

  static getMethodAcl(clazz: EggProtoImplClass, methodName: string): string | undefined {
    const methodAclMap: MethodAclMap | undefined = MetadataUtil.getMetaData(METHOD_ACL, clazz);
    return methodAclMap?.get(methodName);
  }
}
