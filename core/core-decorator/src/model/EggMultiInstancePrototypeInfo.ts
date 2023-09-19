import { ObjectInitTypeLike } from '../enum/ObjectInitType';
import { AccessLevel } from '../enum/AccessLevel';
import { EggPrototypeName } from './EggPrototypeInfo';
import { QualifierInfo } from './QualifierInfo';

export interface ObjectInfo {
  name: EggPrototypeName;
  qualifiers: QualifierInfo[];
}

export interface MultiInstancePrototypeGetObjectsContext {
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
