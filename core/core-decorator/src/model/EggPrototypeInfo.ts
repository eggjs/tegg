import { ObjectInitTypeLike } from '../enum/ObjectInitType';
import { AccessLevel } from '../enum/AccessLevel';
import { QualifierInfo } from './QualifierInfo';

export type EggProtoImplClass<T = object> = new(...args: any[]) => T;
export type EggPrototypeName = PropertyKey;

export interface EggPrototypeInfo {
  /**
   * egg object name
   */
  name: EggPrototypeName;
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
}
