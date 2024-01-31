import {
  EggPrototype,
  EggPrototypeCreatorFactory,
  EggPrototypeLifecycleContext,
  InjectObjectProto, LoadUnit,
} from '@eggjs/tegg-metadata';
import {
  AccessLevel, EggProtoImplClass, EggPrototypeInfo, EggPrototypeName,
  MetaDataKey,
  MetadataUtil,
  ObjectInitTypeLike,
  QualifierInfo,
  QualifierUtil, QualifierValue,
} from '@eggjs/core-decorator';
import { NameUtil } from '@eggjs/tegg-common-util';
import { Id, IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggObjectFactory } from '@eggjs/tegg-dynamic-inject';

export const EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE = 'EGG_OBJECT_FACTORY_PROTOTYPE';

export class EggObjectFactoryPrototype implements EggPrototype {
  readonly clazz: EggProtoImplClass<EggObjectFactory>;
  readonly accessLevel: AccessLevel;
  readonly id: Id;
  readonly initType: ObjectInitTypeLike;
  readonly injectObjects: InjectObjectProto[];
  readonly loadUnitId: string;
  readonly name: EggPrototypeName;
  readonly qualifiers: QualifierInfo[];

  constructor(clazz: EggProtoImplClass<EggObjectFactory>, loadUnit: LoadUnit, prototypeInfo: EggPrototypeInfo) {
    this.clazz = clazz;
    this.qualifiers = [
      ...QualifierUtil.getProtoQualifiers(clazz),
      ...(prototypeInfo.qualifiers ?? []),
    ];
    this.id = IdenticalUtil.createProtoId(loadUnit.id, NameUtil.getClassName(this.clazz));
    this.initType = prototypeInfo.initType;
    this.accessLevel = prototypeInfo.accessLevel;
    this.loadUnitId = loadUnit.id;
    this.name = prototypeInfo.name || NameUtil.getClassName(this.clazz);
    this.injectObjects = [];
  }

  constructEggObject(): EggObjectFactory {
    return Reflect.construct(this.clazz, []);
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.clazz);
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  getQualifier(attribute: string): QualifierValue | undefined {
    return this.qualifiers.find(t => t.attribute === attribute)?.value;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  static create(ctx: EggPrototypeLifecycleContext) {
    return new EggObjectFactoryPrototype(ctx.clazz as EggProtoImplClass<EggObjectFactory>, ctx.loadUnit, ctx.prototypeInfo);
  }
}


EggPrototypeCreatorFactory.registerPrototypeCreator(EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE, EggObjectFactoryPrototype.create);
