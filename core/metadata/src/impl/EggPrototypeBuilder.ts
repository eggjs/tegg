import assert from 'node:assert';
import { InjectType, PrototypeUtil, QualifierUtil } from '@eggjs/core-decorator';
import type {
  AccessLevel,
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeLifecycleContext,
  EggPrototypeName, InjectConstructor,
  InjectObject,
  InjectObjectProto,
  LoadUnit,
  ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/tegg-types';
import {
  DEFAULT_PROTO_IMPL_TYPE,
  InitTypeQualifierAttribute,
  InjectConstructorProto,
  ObjectInitType,
} from '@eggjs/tegg-types';
import { EggPrototypeFactory } from '../factory/EggPrototypeFactory';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototypeImpl } from './EggPrototypeImpl';
import { EggPrototypeCreatorFactory } from '../factory/EggPrototypeCreatorFactory';
import { EggPrototypeNotFound, MultiPrototypeFound } from '../errors';

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
  private className?: string;

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
    builder.qualifiers = [
      ...QualifierUtil.getProtoQualifiers(clazz),
      ...(ctx.prototypeInfo.qualifiers ?? []),
    ];
    return builder.build();
  }

  private tryFindDefaultPrototype(injectObject: InjectObject): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    return EggPrototypeFactory.instance.getPrototype(injectObject.objName, this.loadUnit, propertyQualifiers);
  }

  private tryFindContextPrototype(injectObject: InjectObject): EggPrototype {
    let propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    propertyQualifiers = [
      ...propertyQualifiers,
      {
        attribute: InitTypeQualifierAttribute,
        value: ObjectInitType.CONTEXT,
      },
    ];
    return EggPrototypeFactory.instance.getPrototype(injectObject.objName, this.loadUnit, propertyQualifiers);
  }

  private tryFindSelfInitTypePrototype(injectObject: InjectObject): EggPrototype {
    let propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    propertyQualifiers = [
      ...propertyQualifiers,
      {
        attribute: InitTypeQualifierAttribute,
        value: this.initType,
      },
    ];
    return EggPrototypeFactory.instance.getPrototype(injectObject.objName, this.loadUnit, propertyQualifiers);
  }

  private findInjectObjectPrototype(injectObject: InjectObject): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    try {
      return this.tryFindDefaultPrototype(injectObject);
    } catch (e) {
      if (!(e instanceof MultiPrototypeFound && !propertyQualifiers.find(t => t.attribute === InitTypeQualifierAttribute))) {
        throw e;
      }
    }
    try {
      return this.tryFindContextPrototype(injectObject);
    } catch (e) {
      if (!(e instanceof EggPrototypeNotFound)) {
        throw e;
      }
    }
    return this.tryFindSelfInitTypePrototype(injectObject);
  }

  public build(): EggPrototype {
    const injectObjectProtos: Array<InjectObjectProto | InjectConstructorProto> = [];
    for (const injectObject of this.injectObjects) {
      const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
      const proto = this.findInjectObjectPrototype(injectObject);
      if (this.injectType === InjectType.PROPERTY) {
        injectObjectProtos.push({
          refName: injectObject.refName,
          objName: injectObject.objName,
          qualifiers: propertyQualifiers,
          proto,
        });
      } else {
        injectObjectProtos.push({
          refIndex: (injectObject as InjectConstructor).refIndex,
          refName: injectObject.refName,
          objName: injectObject.objName,
          qualifiers: propertyQualifiers,
          proto,
        });
      }
    }
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
    );
  }
}

EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, EggPrototypeBuilder.create);
