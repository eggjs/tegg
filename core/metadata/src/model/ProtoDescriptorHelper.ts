import assert from 'node:assert';
import {
  EggMultiInstancePrototypeInfo,
  PrototypeUtil,
  QualifierUtil,
} from '@eggjs/core-decorator';
import {
  EggProtoImplClass,
  InitTypeQualifierAttribute,
  InjectObjectDescriptor,
  LoadUnitNameQualifierAttribute,
  ObjectInitTypeLike,
  ProtoDescriptor,
  QualifierInfo,
  AccessLevel,
  MultiInstanceType,
  CreateProtoDescriptorContext,
  CreateMultiInstanceProtoDescriptorContext,
} from '@eggjs/tegg-types';
import { ProtoSelectorContext } from './graph/ProtoSelector';
import { ClassProtoDescriptor } from './ProtoDescriptor/ClassProtoDescriptor';

export class ProtoDescriptorHelper {
  static addDefaultQualifier(qualifiers: QualifierInfo[], initType: ObjectInitTypeLike, loadUnitName: string): QualifierInfo[] {
    const defaultQualifiers = [{
      attribute: InitTypeQualifierAttribute,
      value: initType,
    }, {
      attribute: LoadUnitNameQualifierAttribute,
      value: loadUnitName,
    }];
    const res = [
      ...qualifiers,
    ];
    for (const defaultQualifier of defaultQualifiers) {
      if (!qualifiers.find(t => t.attribute === defaultQualifier.attribute)) {
        res.push(defaultQualifier);
      }
    }
    return res;
  }

  static createByMultiInstanceClazz(clazz: EggProtoImplClass, ctx: CreateMultiInstanceProtoDescriptorContext): ProtoDescriptor[] {
    assert(PrototypeUtil.isEggMultiInstancePrototype(clazz), `clazz ${clazz.name} is not MultiInstancePrototype`);
    const type = PrototypeUtil.getEggMultiInstancePrototypeType(clazz);
    if (type === MultiInstanceType.DYNAMIC) {
      return ProtoDescriptorHelper.createByDynamicMultiInstanceClazz(clazz, ctx);
    } else if (type === MultiInstanceType.STATIC) {
      // static multi instance proto create only in self module
      if (ctx.moduleName === ctx.defineModuleName) {
        return ProtoDescriptorHelper.createByStaticMultiInstanceClazz(clazz, ctx);
      }
    }
    return [];
  }

  static createByDynamicMultiInstanceClazz(clazz: EggProtoImplClass, ctx: CreateMultiInstanceProtoDescriptorContext): ProtoDescriptor[] {
    assert(PrototypeUtil.isEggMultiInstancePrototype(clazz), `clazz ${clazz.name} is not MultiInstancePrototype`);

    const instanceProperty = PrototypeUtil.getDynamicMultiInstanceProperty(clazz, {
      moduleName: ctx.moduleName,
      unitPath: ctx.unitPath,
    });
    assert(instanceProperty, `not found PrototypeInfo for clazz ${clazz.name}`);
    return ProtoDescriptorHelper.#createByMultiInstanceClazz(clazz, instanceProperty, ctx);
  }

  static createByStaticMultiInstanceClazz(clazz: EggProtoImplClass, ctx: CreateMultiInstanceProtoDescriptorContext): ProtoDescriptor[] {
    assert(PrototypeUtil.isEggMultiInstancePrototype(clazz), `clazz ${clazz.name} is not MultiInstancePrototype`);

    const instanceProperty = PrototypeUtil.getStaticMultiInstanceProperty(clazz);
    assert(instanceProperty, `not found PrototypeInfo for clazz ${clazz.name}`);

    return ProtoDescriptorHelper.#createByMultiInstanceClazz(clazz, instanceProperty, ctx);
  }

  static #createByMultiInstanceClazz(clazz: EggProtoImplClass, instanceProperty: EggMultiInstancePrototypeInfo, ctx: CreateMultiInstanceProtoDescriptorContext): ProtoDescriptor[] {
    const res: ProtoDescriptor[] = [];

    for (const obj of instanceProperty.objects) {
      let qualifiers = QualifierUtil.mergeQualifiers(
        QualifierUtil.getProtoQualifiers(clazz),
        obj.qualifiers,
      );
      qualifiers = ProtoDescriptorHelper.addDefaultQualifier(qualifiers, instanceProperty.initType, ctx.moduleName);
      const injectObjects: InjectObjectDescriptor[] = PrototypeUtil.getInjectObjects(clazz)
        .map(t => {
          const qualifiers = QualifierUtil.getProperQualifiers(clazz, t.refName);
          const instanceQualifier = obj.properQualifiers?.[t.refName] ?? [];
          return {
            ...t,
            qualifiers: QualifierUtil.mergeQualifiers(
              qualifiers,
              instanceQualifier,
            ),
          };
        });
      res.push(new ClassProtoDescriptor({
        name: obj.name,
        accessLevel: instanceProperty.accessLevel,
        initType: instanceProperty.initType,
        protoImplType: instanceProperty.protoImplType,
        qualifiers,
        injectObjects,
        instanceModuleName: ctx.moduleName,
        instanceDefineUnitPath: ctx.unitPath,
        defineModuleName: ctx.defineModuleName,
        defineUnitPath: ctx.defineUnitPath,
        clazz,
        properQualifiers: obj.properQualifiers || {},
      }));
    }
    return res;
  }

  static createByInstanceClazz(clazz: EggProtoImplClass, ctx: CreateProtoDescriptorContext): ProtoDescriptor {
    assert(PrototypeUtil.isEggPrototype(clazz), `clazz ${clazz.name} is not EggPrototype`);
    assert(!PrototypeUtil.isEggMultiInstancePrototype(clazz), `clazz ${clazz.name} is not Prototype`);

    const property = PrototypeUtil.getProperty(clazz);
    assert(property, `not found PrototypeInfo for clazz ${clazz.name}`);

    const protoQualifiers = ProtoDescriptorHelper.addDefaultQualifier(QualifierUtil.getProtoQualifiers(clazz), property.initType, ctx.moduleName);
    const injectObjects = PrototypeUtil.getInjectObjects(clazz)
      .map(t => {
        const qualifiers = QualifierUtil.getProperQualifiers(clazz, t.refName);
        return {
          ...t,
          qualifiers,
        };
      });
    return new ClassProtoDescriptor({
      name: property.name,
      protoImplType: property.protoImplType,
      accessLevel: property.accessLevel,
      initType: property.initType,
      qualifiers: protoQualifiers,
      injectObjects,
      instanceDefineUnitPath: ctx.unitPath,
      instanceModuleName: ctx.moduleName,
      defineUnitPath: ctx.defineUnitPath || ctx.unitPath,
      defineModuleName: ctx.defineModuleName || ctx.moduleName,
      clazz,
      properQualifiers: {},
    });
  }

  static selectProto(proto: ProtoDescriptor, ctx: ProtoSelectorContext): boolean {
    // 1. name match
    if (proto.name !== ctx.name) {
      return false;
    }
    // 2. access level match
    if (proto.accessLevel !== AccessLevel.PUBLIC && proto.instanceModuleName !== ctx.moduleName) {
      return false;
    }
    // 3. qualifier match
    if (!QualifierUtil.matchQualifiers(proto.qualifiers, ctx.qualifiers)) {
      return false;
    }
    return true;
  }
}
