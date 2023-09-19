import {
  QualifierInfo,
  EggPrototypeName,
  AccessLevel,
  ObjectInitTypeLike,
  MetaDataKey,
  EggProtoImplClass, EggPrototypeInfo, QualifierValue, QualifierAttribute,
} from '@eggjs/core-decorator';
import { LifecycleObject, LifecycleContext, LifecycleUtil } from '@eggjs/tegg-lifecycle';
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
  readonly className: string;

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

export const EggPrototypeLifecycleUtil = new LifecycleUtil<EggPrototypeLifecycleContext, EggPrototype>();
