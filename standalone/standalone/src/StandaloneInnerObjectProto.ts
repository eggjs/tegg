import {
  AccessLevel,
  EggProtoImplClass,
  EggPrototypeName, MetaDataKey,
  MetadataUtil,
  ObjectInitTypeLike,
  QualifierInfo,
  QualifierUtil,
  Id,
  IdenticalUtil, QualifierValue,
} from '@eggjs/tegg';
import {
  EggPrototype,
  InjectObjectProto,
  EggPrototypeLifecycleContext,
} from '@eggjs/tegg-metadata';

export class StandaloneInnerObjectProto implements EggPrototype {
  private readonly clazz: EggProtoImplClass;
  private readonly qualifiers: QualifierInfo[];

  readonly id: string;
  readonly name: EggPrototypeName;
  readonly initType: ObjectInitTypeLike;
  readonly accessLevel: AccessLevel;
  readonly injectObjects: InjectObjectProto[];
  readonly loadUnitId: Id;
  readonly className?: string;

  constructor(
    id: string,
    name: EggPrototypeName,
    clazz: EggProtoImplClass,
    initType: ObjectInitTypeLike,
    loadUnitId: Id,
    qualifiers: QualifierInfo[],
    className?: string,
  ) {
    this.id = id;
    this.clazz = clazz;
    this.name = name;
    this.initType = initType;
    this.accessLevel = AccessLevel.PUBLIC;
    this.injectObjects = [];
    this.loadUnitId = loadUnitId;
    this.qualifiers = qualifiers;
    this.className = className;
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

  getQualifier(attribute: string): QualifierValue | undefined {
    return this.qualifiers.find(t => t.attribute === attribute)?.value;
  }

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    const { clazz, loadUnit } = ctx;
    const name = ctx.prototypeInfo.name;
    const className = ctx.prototypeInfo.className;
    const id = IdenticalUtil.createProtoId(loadUnit.id, name);
    const proto = new StandaloneInnerObjectProto(
      id, name, clazz, ctx.prototypeInfo.initType, loadUnit.id, QualifierUtil.getProtoQualifiers(clazz), className,
    );
    return proto;
  }
}
