import assert from 'assert';
import {
  AccessLevel,
  EggProtoImplClass,
  EggPrototypeName, InitTypeQualifierAttribute,
  ObjectInitTypeLike, PrototypeUtil,
  QualifierInfo, QualifierUtil,
  DEFAULT_PROTO_IMPL_TYPE, ObjectInitType,
} from '@eggjs/core-decorator';
import { LoadUnit } from '../model/LoadUnit';
import { EggPrototype, EggPrototypeLifecycleContext, InjectObjectProto } from '../model/EggPrototype';
import { EggPrototypeFactory } from '../factory/EggPrototypeFactory';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototypeImpl } from '../impl/EggPrototypeImpl';
import { EggPrototypeCreatorFactory } from '../factory/EggPrototypeCreatorFactory';
import { EggPrototypeNotFound, MultiPrototypeFound } from '../errors';

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

export class EggPrototypeBuilder {
  private clazz: EggProtoImplClass;
  private name: EggPrototypeName;
  private initType: ObjectInitTypeLike;
  private accessLevel: AccessLevel;
  private filepath: string;
  private injectObjects: Array<InjectObject> = [];
  private loadUnit: LoadUnit;
  private qualifiers: QualifierInfo[] = [];

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    const { clazz, loadUnit } = ctx;
    const filepath = PrototypeUtil.getFilePath(clazz);
    assert(filepath, 'not find filepath');
    let property = PrototypeUtil.getProperty(clazz);
    assert(property, 'not find property');
    property = property!;
    const builder = new EggPrototypeBuilder();
    builder.clazz = clazz;
    builder.name = property.name;
    builder.initType = property.initType;
    builder.accessLevel = property.accessLevel;
    builder.filepath = filepath!;
    builder.injectObjects = PrototypeUtil.getInjectObjects(clazz) || [];
    builder.loadUnit = loadUnit;
    builder.qualifiers = QualifierUtil.getProtoQualifiers(clazz);
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
    const injectObjectProtos: InjectObjectProto[] = [];
    for (const injectObject of this.injectObjects) {
      const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
      const proto = this.findInjectObjectPrototype(injectObject);
      injectObjectProtos.push({
        refName: injectObject.refName,
        objName: injectObject.objName,
        qualifiers: propertyQualifiers,
        proto,
      });
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
    );
  }
}

EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, EggPrototypeBuilder.create);
