import { ObjectInitTypeLike } from '../enum/ObjectInitType';
import { AccessLevel } from '../enum/AccessLevel';
import { EggPrototypeName } from './EggPrototypeInfo';
import { QualifierInfo } from './QualifierInfo';

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
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext): ObjectInfo[];
}
