import {
  EggProtoImplClass,
  EggPrototype,
  InitTypeQualifierAttribute,
  InjectConstructor,
  InjectConstructorProto,
  InjectObject,
  type InjectObjectProto,
  InjectType,
  LoadUnit,
  ObjectInitType,
  type ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { QualifierUtil } from '@eggjs/core-decorator';
import { EggPrototypeFactory } from '../factory/EggPrototypeFactory';
import { EggPrototypeNotFound, MultiPrototypeFound } from '../errors';

interface EggProtoInfo {
  clazz: EggProtoImplClass;
  loadUnit: LoadUnit;
  properQualifiers: Record<PropertyKey, QualifierInfo[]>;
  initType: ObjectInitTypeLike;
  injectType?: InjectType;
  injectObjects: Array<InjectObject | InjectConstructor>;
}

export class InjectObjectPrototypeFinder {
  private static tryFindDefaultPrototype(proto: EggProtoInfo, injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(proto.clazz, injectObject.refName);
    const multiInstancePropertyQualifiers = proto.properQualifiers[injectObject.refName as string] ?? [];
    return EggPrototypeFactory.instance.getPrototype(injectObject.objName, proto.loadUnit, QualifierUtil.mergeQualifiers(
      propertyQualifiers,
      multiInstancePropertyQualifiers,
    ));
  }

  private static tryFindContextPrototype(proto: EggProtoInfo, injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(proto.clazz, injectObject.refName);
    const multiInstancePropertyQualifiers = proto.properQualifiers[injectObject.refName as string] ?? [];
    return EggPrototypeFactory.instance.getPrototype(injectObject.objName, proto.loadUnit, QualifierUtil.mergeQualifiers(
      propertyQualifiers,
      multiInstancePropertyQualifiers,
      [{
        attribute: InitTypeQualifierAttribute,
        value: ObjectInitType.CONTEXT,
      }],
    ));
  }

  private static tryFindSelfInitTypePrototype(proto: EggProtoInfo, injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(proto.clazz, injectObject.refName);
    const multiInstancePropertyQualifiers = proto.properQualifiers[injectObject.refName as string] ?? [];
    return EggPrototypeFactory.instance.getPrototype(injectObject.objName, proto.loadUnit, QualifierUtil.mergeQualifiers(
      propertyQualifiers,
      multiInstancePropertyQualifiers,
      [{
        attribute: InitTypeQualifierAttribute,
        value: proto.initType,
      }],
    ));
  }

  private static findInjectObjectPrototype(proto: EggProtoInfo, injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(proto.clazz, injectObject.refName);
    try {
      return InjectObjectPrototypeFinder.tryFindDefaultPrototype(proto, injectObject);
    } catch (e) {
      if (!(e instanceof MultiPrototypeFound && !propertyQualifiers.find(t => t.attribute === InitTypeQualifierAttribute))) {
        throw e;
      }
    }
    try {
      return InjectObjectPrototypeFinder.tryFindContextPrototype(proto, injectObject);
    } catch (e) {
      if (!(e instanceof EggPrototypeNotFound)) {
        throw e;
      }
    }
    return InjectObjectPrototypeFinder.tryFindSelfInitTypePrototype(proto, injectObject);
  }

  static findInjectObjectPrototypes(targetProto: EggProtoInfo) {
    const injectObjectProtos: Array<InjectObjectProto | InjectConstructorProto> = [];
    for (const injectObject of targetProto.injectObjects) {
      const propertyQualifiers = QualifierUtil.getProperQualifiers(targetProto.clazz, injectObject.refName);
      try {
        const proto = InjectObjectPrototypeFinder.findInjectObjectPrototype(targetProto, injectObject);
        let injectObjectProto: InjectObjectProto | InjectConstructorProto;
        if (targetProto.injectType === InjectType.PROPERTY) {
          injectObjectProto = {
            refName: injectObject.refName,
            objName: injectObject.objName,
            qualifiers: propertyQualifiers,
            proto,
          };
        } else {
          injectObjectProto = {
            refIndex: (injectObject as InjectConstructor).refIndex,
            refName: injectObject.refName,
            objName: injectObject.objName,
            qualifiers: propertyQualifiers,
            proto,
          };
        }
        if (injectObject.optional) {
          injectObject.optional = true;
        }
        injectObjectProtos.push(injectObjectProto);
      } catch (e) {
        if (e instanceof EggPrototypeNotFound && injectObject.optional) {
          continue;
        }
        throw e;
      }
    }

    return injectObjectProtos;
  }
}
