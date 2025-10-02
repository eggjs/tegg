import { ObjectInitTypeLike, AccessLevel } from '../enum/index.js';
import { QualifierInfo } from './QualifierInfo.js';

export type EggProtoImplClass<T = object> = new(...args: any[]) => T;
export type EggPrototypeName = PropertyKey;

export interface EggPrototypeInfo {
  /**
   * egg object name
   */
  name: EggPrototypeName;
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
   * EggPrototype qualifiers
   */
  qualifiers?: QualifierInfo[];
  /**
   * EggPrototype properties qualifiers
   */
  properQualifiers?: Record<string, QualifierInfo[]>;
}
