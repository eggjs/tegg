import { InitTypeQualifierAttribute, LoadUnitNameQualifierAttribute, PrototypeUtil } from '@eggjs/core-decorator';
import type {
  EggProtoImplClass,
  EggPrototypeInfo,
  EggPrototypeCreator,
  LoadUnit,
  EggPrototype,
  EggPrototypeLifecycleContext,
} from '@eggjs/tegg-types';
import { EggPrototypeLifecycleUtil } from '../model/EggPrototype';

export class EggPrototypeCreatorFactory {
  private static creatorMap = new Map<string, EggPrototypeCreator>();

  static registerPrototypeCreator(type: string, creator: EggPrototypeCreator) {
    this.creatorMap.set(type, creator);
  }

  static getPrototypeCreator(type: string): EggPrototypeCreator | undefined {
    return this.creatorMap.get(type);
  }

  static async createProto(clazz: EggProtoImplClass, loadUnit: LoadUnit): Promise<EggPrototype[]> {
    let properties: EggPrototypeInfo[] = [];
    if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
      const multiInstanceProtoInfo = PrototypeUtil.getMultiInstanceProperty(clazz, {
        unitPath: loadUnit.unitPath,
        moduleName: loadUnit.name,
      })!;
      for (const obj of multiInstanceProtoInfo.objects) {
        const defaultQualifier = [{
          attribute: InitTypeQualifierAttribute,
          value: PrototypeUtil.getInitType(clazz, {
            unitPath: loadUnit.unitPath,
            moduleName: loadUnit.name,
          })!,
        }, {
          attribute: LoadUnitNameQualifierAttribute,
          value: loadUnit.name,
        }];
        defaultQualifier.forEach(qualifier => {
          if (!obj.qualifiers.find(t => t.attribute === qualifier.attribute)) {
            obj.qualifiers.push(qualifier);
          }
        });

        properties.push({
          name: obj.name,
          protoImplType: multiInstanceProtoInfo.protoImplType,
          initType: multiInstanceProtoInfo.initType,
          accessLevel: multiInstanceProtoInfo.accessLevel,
          qualifiers: obj.qualifiers,
          properQualifiers: obj.properQualifiers,
          className: multiInstanceProtoInfo.className,
        });
      }
    } else {
      properties = [ PrototypeUtil.getProperty(clazz)! ];
    }
    const protos: EggPrototype[] = [];
    for (const property of properties) {
      const creator = this.getPrototypeCreator(property.protoImplType);
      if (!creator) {
        throw new Error(`not found proto creator for type: ${property.protoImplType}`);
      }
      const ctx: EggPrototypeLifecycleContext = {
        clazz,
        loadUnit,
        prototypeInfo: property,
      };
      const proto = creator(ctx);
      // TODO release egg prototype
      await EggPrototypeLifecycleUtil.objectPreCreate(ctx, proto);
      if (proto.init) {
        await proto.init(ctx);
      }
      await EggPrototypeLifecycleUtil.objectPostCreate(ctx, proto);
      PrototypeUtil.setClazzProto(clazz, proto);
      protos.push(proto);
    }
    return protos;

  }
}
