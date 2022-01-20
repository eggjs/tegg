import { EggProtoImplClass } from '@eggjs/core-decorator';

export enum PointcutType {
  /**
   * use class type to match
   */
  CLASS = 'CLASS',
  /**
   * use regexp to match className and methodName
   */
  NAME = 'NAME',
  /**
   * use custom function to match
   */
  CUSTOM = 'CUSTOM',
}

export interface PointcutInfo {
  type: PointcutType;

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean;
}

export class ClassPointInfo implements PointcutInfo {
  readonly type = PointcutType.CLASS;
  readonly clazz: EggProtoImplClass;
  readonly method: PropertyKey;

  constructor(clazz: EggProtoImplClass, method: PropertyKey) {
    this.clazz = clazz;
    this.method = method;
  }

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean {
    return (
      // self class
      this.clazz === clazz ||
      // inherit case
      clazz.prototype instanceof this.clazz
    ) && this.method === method;
  }
}

export class NamePointInfo implements PointcutInfo {
  readonly type = PointcutType.NAME;
  readonly className: RegExp;
  readonly methodName: RegExp;

  constructor(className: RegExp, methodName: RegExp) {
    this.className = className;
    this.methodName = methodName;
  }

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean {
    return this.className.test(clazz.name) && this.methodName.test(String(method));
  }
}

export type CustomPointcutCallback = (clazz: EggProtoImplClass, method: PropertyKey) => boolean;

export class CustomPointInfo implements PointcutInfo {
  readonly type = PointcutType.CUSTOM;
  readonly cb: CustomPointcutCallback;

  constructor(cb: CustomPointcutCallback) {
    this.cb = cb;
  }

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean {
    return this.cb(clazz, method);
  }
}
