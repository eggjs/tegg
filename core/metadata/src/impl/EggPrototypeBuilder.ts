import assert from 'node:assert';
import { InjectType, PrototypeUtil, QualifierAttribute, QualifierUtil } from '@eggjs/core-decorator';
import type {
  AccessLevel,
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeLifecycleContext,
  EggPrototypeName,
  InjectConstructor,
  InjectObject,
  LoadUnit,
  ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { DEFAULT_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototypeImpl } from './EggPrototypeImpl';
import { EggPrototypeCreatorFactory } from '../factory/EggPrototypeCreatorFactory';
import { InjectObjectPrototypeFinder } from './InjectObjectPrototypeFinder';

export class EggPrototypeBuilder {
  private clazz: EggProtoImplClass;
  private name: EggPrototypeName;
  private initType: ObjectInitTypeLike;
  private accessLevel: AccessLevel;
  private filepath: string;
  private injectType: InjectType | undefined;
  private injectObjects: Array<InjectObject | InjectConstructor> = [];
  private loadUnit: LoadUnit;
  private qualifiers: QualifierInfo[] = [];
  private properQualifiers: Record<PropertyKey, QualifierInfo[]> = {};
  private className?: string;
  private multiInstanceConstructorIndex?: number;
  private multiInstanceConstructorAttributes?: QualifierAttribute[];

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    const { clazz, loadUnit } = ctx;
    const filepath = PrototypeUtil.getFilePath(clazz);
    assert(filepath, 'not find filepath');
    const builder = new EggPrototypeBuilder();
    builder.clazz = clazz;
    builder.name = ctx.prototypeInfo.name;
    builder.className = ctx.prototypeInfo.className;
    builder.initType = ctx.prototypeInfo.initType;
    builder.accessLevel = ctx.prototypeInfo.accessLevel;
    builder.filepath = filepath!;
    builder.injectType = PrototypeUtil.getInjectType(clazz);
    builder.injectObjects = PrototypeUtil.getInjectObjects(clazz) || [];
    builder.loadUnit = loadUnit;
    builder.qualifiers = QualifierUtil.mergeQualifiers(
      QualifierUtil.getProtoQualifiers(clazz),
      (ctx.prototypeInfo.qualifiers ?? []),
    );
    builder.properQualifiers = ctx.prototypeInfo.properQualifiers ?? {};
    builder.multiInstanceConstructorIndex = PrototypeUtil.getMultiInstanceConstructorIndex(clazz);
    builder.multiInstanceConstructorAttributes = PrototypeUtil.getMultiInstanceConstructorAttributes(clazz);
    return builder.build();
  }

  public build(): EggPrototype {
    const injectObjectProtos = InjectObjectPrototypeFinder.findInjectObjectPrototypes({
      clazz: this.clazz,
      loadUnit: this.loadUnit,
      properQualifiers: this.properQualifiers,
      initType: this.initType,
      injectType: this.injectType,
      injectObjects: this.injectObjects,
    });
    const id = IdenticalUtil.createProtoId(this.loadUnit.id, this.name);
    return new EggPrototypeImpl(
      id,
      this.name,
      this.clazz,
      this.filepath,
      this.initType,
      this.accessLevel,
      injectObjectProtos,
      this.loadUnit.id,
      this.qualifiers,
      this.className,
      this.injectType,
      this.multiInstanceConstructorIndex,
      this.multiInstanceConstructorAttributes,
    );
  }
}

EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, EggPrototypeBuilder.create);
