import { InjectType, MetadataUtil } from '@eggjs/core-decorator';
import type {
  AccessLevel,
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeName,
  Id,
  InjectConstructorProto,
  InjectObjectProto,
  MetaDataKey,
  ObjectInitTypeLike,
  QualifierInfo,
  QualifierValue,
} from '@eggjs/tegg-types';

export class EggPrototypeImpl implements EggPrototype {
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
}
