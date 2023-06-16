import {
  AccessLevel,
  EggProtoImplClass,
  EggPrototypeName, MetaDataKey,
  MetadataUtil,
  ObjectInitTypeLike,
  QualifierInfo,
  PrototypeUtil,
  QualifierUtil,
  Id,
  IdenticalUtil,
} from '@eggjs/tegg';
import {
  EggPrototype,
  InjectObjectProto,
  EggPrototypeLifecycleContext,
} from '@eggjs/tegg-metadata';


export const COMPATIBLE_PROTO_IMPLE_TYPE = 'EGG_COMPATIBLE';

export class EggCompatibleProtoImpl implements EggPrototype {
  private readonly clazz: EggProtoImplClass;
  private readonly qualifiers: QualifierInfo[];

  readonly id: string;
  readonly name: EggPrototypeName;
  readonly initType: ObjectInitTypeLike;
  readonly accessLevel: AccessLevel;
  readonly injectObjects: InjectObjectProto[];
  readonly loadUnitId: Id;

  constructor(
    id: string,
    name: EggPrototypeName,
    clazz: EggProtoImplClass,
    initType: ObjectInitTypeLike,
    loadUnitId: Id,
    qualifiers: QualifierInfo[],
  ) {
    this.id = id;
    this.clazz = clazz;
    this.name = name;
    this.initType = initType;
    this.accessLevel = AccessLevel.PUBLIC;
    this.injectObjects = [];
    this.loadUnitId = loadUnitId;
    this.qualifiers = qualifiers;
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

  constructEggObject(): object {
    return Reflect.apply(this.clazz, null, []);
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.clazz);
  }

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    const { clazz, loadUnit } = ctx;
    const property = PrototypeUtil.getProperty(clazz)!;
    const name = property.name;
    const id = IdenticalUtil.createProtoId(loadUnit.id, name);
    const proto = new EggCompatibleProtoImpl(
      id, name, clazz, property.initType, loadUnit.id, QualifierUtil.getProtoQualifiers(clazz),
    );
    return proto;
  }
}
