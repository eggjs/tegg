import {
  EggMultiInstancePrototypeInfo,
  PrototypeUtil,
  QualifierUtil,
} from '@eggjs/core-decorator';
import {
  EggProtoImplClass,
  InitTypeQualifierAttribute, InjectObjectDescriptor,
  LoadUnitNameQualifierAttribute,
  ObjectInitTypeLike,
  ProtoDescriptor,
  QualifierInfo,
  AccessLevel,
  MultiInstancePrototypeGetObjectsContext,
  MultiInstanceType,
} from '@eggjs/tegg-types';
import assert from 'node:assert';
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

  static createByMultiInstanceClazz(clazz: EggProtoImplClass, options: {
    defineModuleName: string;
    defineUnitPath: string;
    instanceModuleName: string;
    instanceDefineUnitPath: string;
  }): ProtoDescriptor[] {
    assert(PrototypeUtil.isEggMultiInstancePrototype(clazz), `clazz ${clazz.name} is not MultiInstancePrototype`);
    const type = PrototypeUtil.getEggMultiInstancePrototypeType(clazz);
    if (type === MultiInstanceType.DYNAMIC) {
      return ProtoDescriptorHelper.createByDynamicMultiInstanceClazz(clazz, options);
    } else if (type === MultiInstanceType.STATIC) {
      // static multi instance proto create only in self module
      if (options.defineModuleName === options.instanceModuleName) {
        return ProtoDescriptorHelper.createByStaticMultiInstanceClazz(clazz, options);
      }
    }
    return [];
  }

  static createByDynamicMultiInstanceClazz(clazz: EggProtoImplClass, options: {
    defineModuleName: string;
    defineUnitPath: string;
    instanceModuleName: string;
    instanceDefineUnitPath: string;
  }): ProtoDescriptor[] {
    assert(PrototypeUtil.isEggMultiInstancePrototype(clazz), `clazz ${clazz.name} is not MultiInstancePrototype`);

    const instanceProperty = PrototypeUtil.getDynamicMultiInstanceProperty(clazz, {
      moduleName: options.instanceModuleName,
      unitPath: options.instanceDefineUnitPath,
    });
    assert(instanceProperty, `not found PrototypeInfo for clazz ${clazz.name}`);
    return ProtoDescriptorHelper.#createByMultiInstanceClazz(clazz, instanceProperty, options);
  }

  static createByStaticMultiInstanceClazz(clazz: EggProtoImplClass, options: {
    defineModuleName: string;
    defineUnitPath: string;
    instanceModuleName: string;
    instanceDefineUnitPath: string;
  }): ProtoDescriptor[] {
    assert(PrototypeUtil.isEggMultiInstancePrototype(clazz), `clazz ${clazz.name} is not MultiInstancePrototype`);

    const instanceProperty = PrototypeUtil.getStaticMultiInstanceProperty(clazz);
    assert(instanceProperty, `not found PrototypeInfo for clazz ${clazz.name}`);

    return ProtoDescriptorHelper.#createByMultiInstanceClazz(clazz, instanceProperty, options);
  }

  static #createByMultiInstanceClazz(clazz: EggProtoImplClass, instanceProperty: EggMultiInstancePrototypeInfo, options: {
    defineModuleName: string;
    defineUnitPath: string;
    instanceModuleName: string;
    instanceDefineUnitPath: string;
  }): ProtoDescriptor[] {
    const res: ProtoDescriptor[] = [];

    for (const obj of instanceProperty.objects) {
      let qualifiers = QualifierUtil.mergeQualifiers(
        QualifierUtil.getProtoQualifiers(clazz),
        obj.qualifiers,
      );
      qualifiers = ProtoDescriptorHelper.addDefaultQualifier(qualifiers, instanceProperty.initType, options.instanceModuleName);
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
        instanceModuleName: options.instanceModuleName,
        instanceDefineUnitPath: options.instanceDefineUnitPath,
        defineModuleName: options.defineModuleName,
        defineUnitPath: options.defineUnitPath,
        clazz,
        properQualifiers: obj.properQualifiers || {},
      }));
    }
    return res;
  }

  static createByInstanceClazz(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): ProtoDescriptor {
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
      defineUnitPath: ctx.unitPath,
      defineModuleName: ctx.moduleName,
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
