import { ObjectInitTypeLike, AccessLevel } from '../enum/index.js';
import { EggPrototypeName } from './EggPrototypeInfo.js';
import { QualifierInfo } from './QualifierInfo.js';

export interface ObjectInfo {
  name: EggPrototypeName;
  qualifiers: QualifierInfo[];
  properQualifiers?: Record<PropertyKey, QualifierInfo[]>;
}

export interface MultiInstancePrototypeGetObjectsContext {
  // instance module, multi instance proto used in
  moduleName: string;
  unitPath: string;
}

export interface EggMultiInstancePrototypeInfo {
  /**
   * The class name of the object
   */
  className?: string;
  /**
   * obj init type
   */
  initType: ObjectInitTypeLike;
  /**
   * access level
   */
  accessLevel: AccessLevel;
  /**
   * EggPrototype implement type
   */
  protoImplType: string;

  /**
   * object info list
   */
  objects: ObjectInfo[];
}

export interface EggMultiInstanceCallbackPrototypeInfo {
  /**
   * The class name of the object
   */
  className?: string;
  /**
   * obj init type
   */
  initType: ObjectInitTypeLike;
  /**
   * access level
   */
  accessLevel: AccessLevel;
  /**
   * EggPrototype implement type
   */
  protoImplType: string;

  /**
   * get object callback
   * @param ctx
   */
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext): Promise<ObjectInfo[]>;
}
