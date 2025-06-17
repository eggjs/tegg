import assert from 'node:assert';
import {
  EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
  InjectType,
  MetadataUtil,
  PrototypeUtil,
  QualifierAttribute,
  QualifierUtil,
} from '@eggjs/core-decorator';
import type {
  AccessLevel,
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeLifecycleContext,
  EggPrototypeName,
  Id,
  InjectConstructorProto,
  InjectObjectProto,
  MetaDataKey,
  ObjectInitTypeLike,
  QualifierInfo,
  QualifierValue,
} from '@eggjs/tegg-types';
import { InjectObjectPrototypeFinder } from './InjectObjectPrototypeFinder';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototypeCreatorFactory } from '../factory/EggPrototypeCreatorFactory';

export class EggInnerObjectPrototypeImpl implements EggPrototype {
  private readonly clazz: EggProtoImplClass;
  private readonly qualifiers: QualifierInfo[];
  readonly filepath: string;

  readonly id: string;
  readonly name: EggPrototypeName;
  readonly initType: ObjectInitTypeLike;
  readonly accessLevel: AccessLevel;
  readonly injectObjects: Array<InjectObjectProto | InjectConstructorProto>;
  readonly injectType: InjectType;
  readonly loadUnitId: Id;
  readonly className?: string;
  readonly multiInstanceConstructorIndex?: number;
  readonly multiInstanceConstructorAttributes?: QualifierAttribute[];

  constructor(
    id: string,
    name: EggPrototypeName,
    clazz: EggProtoImplClass,
    filepath: string,
    initType: ObjectInitTypeLike,
    accessLevel: AccessLevel,
    injectObjectMap: Array<InjectObjectProto | InjectConstructorProto>,
    loadUnitId: Id,
    qualifiers: QualifierInfo[],
    className?: string,
    injectType?: InjectType,
    multiInstanceConstructorIndex?: number,
    multiInstanceConstructorAttributes?: QualifierAttribute[],
  ) {
    this.id = id;
    this.clazz = clazz;
    this.name = name;
    this.filepath = filepath;
    this.initType = initType;
    this.accessLevel = accessLevel;
    this.injectObjects = injectObjectMap;
    this.loadUnitId = loadUnitId;
    this.qualifiers = qualifiers;
    this.className = className;
    this.injectType = injectType || InjectType.PROPERTY;
    this.multiInstanceConstructorIndex = multiInstanceConstructorIndex;
    this.multiInstanceConstructorAttributes = multiInstanceConstructorAttributes;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  getQualifier(attribute: string): QualifierValue | undefined {
    return this.qualifiers.find(t => t.attribute === attribute)?.value;
  }

  constructEggObject(...args: any): object {
    return Reflect.construct(this.clazz, args);
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.clazz);
  }

  static create(ctx: EggPrototypeLifecycleContext) {
    const { clazz, loadUnit } = ctx;
    const filepath = PrototypeUtil.getFilePath(clazz);
    assert(filepath, 'not find filepath');
    const name = ctx.prototypeInfo.name;
    const className = ctx.prototypeInfo.className;
    const initType = ctx.prototypeInfo.initType;
    const accessLevel = ctx.prototypeInfo.accessLevel;
    const injectType = PrototypeUtil.getInjectType(clazz);
    const injectObjects = PrototypeUtil.getInjectObjects(clazz) || [];
    const qualifiers = QualifierUtil.mergeQualifiers(
      QualifierUtil.getProtoQualifiers(clazz),
      (ctx.prototypeInfo.qualifiers ?? []),
    );
    const properQualifiers = ctx.prototypeInfo.properQualifiers ?? {};
    const multiInstanceConstructorIndex = PrototypeUtil.getMultiInstanceConstructorIndex(clazz);
    const multiInstanceConstructorAttributes = PrototypeUtil.getMultiInstanceConstructorAttributes(clazz);
    const injectObjectProtos = InjectObjectPrototypeFinder.findInjectObjectPrototypes({
      clazz,
      loadUnit,
      properQualifiers,
      initType,
      injectType,
      injectObjects,
    });
    const id = IdenticalUtil.createProtoId(loadUnit.id, name);

    return new EggInnerObjectPrototypeImpl(
      id,
      name,
      clazz,
      filepath,
      initType,
      accessLevel,
      injectObjectProtos,
      loadUnit.id,
      qualifiers,
      className,
      injectType,
      multiInstanceConstructorIndex,
      multiInstanceConstructorAttributes,
    );
  }
}

EggPrototypeCreatorFactory.registerPrototypeCreator(EGG_INNER_OBJECT_PROTO_IMPL_TYPE, EggInnerObjectPrototypeImpl.create);
