import { EggPrototype, LoadUnit, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import {
  AccessLevel,
  EggPrototypeName,
  ObjectInitType,
  QualifierInfo,
  QualifierUtil,
  MetadataUtil,
  MetaDataKey,
} from '@eggjs/tegg';
import { Id, IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { Bone } from 'leoric';

export default class ContextModelProto implements EggPrototype {
  private readonly qualifiers: QualifierInfo[];
  readonly accessLevel = AccessLevel.PUBLIC;
  id: Id;
  readonly initType = ObjectInitType.CONTEXT;
  readonly injectObjects = [];
  readonly loadUnitId: string;
  readonly moduleName: string;
  readonly name: EggPrototypeName;
  readonly model: typeof Bone;

  constructor(loadUnit: LoadUnit, model: typeof Bone) {
    this.model = model;
    this.id = IdenticalUtil.createProtoId(loadUnit.id, `leoric:${model.name}`);
    this.loadUnitId = loadUnit.id;
    this.moduleName = loadUnit.name;
    this.name = model.name;
    this.qualifiers = QualifierUtil.getProtoQualifiers(model);
  }

  constructEggObject(): object {
    return {};
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.model);
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  static createProto(ctx: EggPrototypeLifecycleContext): ContextModelProto {
    return new ContextModelProto(ctx.loadUnit, ctx.clazz as typeof Bone);
  }
}
