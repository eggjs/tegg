import {
  AccessLevel,
  EggProtoImplClass,
  EggPrototypeInfo,
  EggPrototypeName,
  MetaDataKey,
  ObjectInitTypeLike,
  QualifierAttribute,
  QualifierInfo,
  QualifierValue,
} from '../../core-decorator';
import { LifecycleContext, LifecycleObject } from '../../lifecycle';
import { LoadUnit } from './LoadUnit';

export interface InjectObjectProto {
  /**
   * property name obj inject to
   */
  refName: PropertyKey;
  /**
   * obj's name will be injected
   */
  objName: PropertyKey;
  /**
   * inject qualifiers
   */
  qualifiers: QualifierInfo[];
  /**
   * inject prototype
   */
  proto: EggPrototype;
}

export interface InjectObject {
  /**
   * property name obj inject to
   */
  refName: PropertyKey;
  /**
   * obj's name will be injected
   */
  objName: PropertyKey;
  /**
   * obj's initType will be injected
   * if null same as current obj
   */
  initType?: ObjectInitTypeLike;
}

export type EggPrototypeClass = new (...args: any[]) => EggPrototype;

export interface EggPrototypeLifecycleContext extends LifecycleContext {
  clazz: EggProtoImplClass;
  prototypeInfo: EggPrototypeInfo;
  loadUnit: LoadUnit;
}

export interface EggPrototype extends LifecycleObject<EggPrototypeLifecycleContext> {
  // TODO
  // 1. proto name
  // 1. default obj name
  readonly name: EggPrototypeName;
  readonly initType: ObjectInitTypeLike;
  readonly accessLevel: AccessLevel;
  readonly loadUnitId: string;
  readonly injectObjects: InjectObjectProto[];
  readonly className?: string;

  /**
   * get metedata for key
   * @param {MetaDataKey} metadataKey
   */
  getMetaData<T>(metadataKey: MetaDataKey): T | undefined;

  /**
   * verify proto is satisfied with qualifier
   *
   * default qualifier:
   * - load unit name
   * - init type
   *
   * @param qualifier
   */
  verifyQualifier(qualifier: QualifierInfo): boolean;
  verifyQualifiers(qualifiers: QualifierInfo[]): boolean;
  getQualifier(attribute: QualifierAttribute): QualifierValue | undefined

  /**
   * construct egg object, not trigger lifecycle method/hook
   */
  constructEggObject(): object;
}

export interface EggPrototypeWithClazz extends EggPrototype {
  clazz?: EggProtoImplClass;
}

export type EggPrototypeCreator = (ctx: EggPrototypeLifecycleContext) => EggPrototype;
