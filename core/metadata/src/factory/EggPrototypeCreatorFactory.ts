import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import { LoadUnit } from '../model/LoadUnit';
import { EggPrototype, EggPrototypeLifecycleContext, EggPrototypeLifecycleUtil } from '../model/EggPrototype';

export type EggPrototypeCreator = (ctx: EggPrototypeLifecycleContext) => EggPrototype;

export class EggPrototypeCreatorFactory {
  private static creatorMap = new Map<string, EggPrototypeCreator>();

  static registerPrototypeCreator(type: string, creator: EggPrototypeCreator) {
    this.creatorMap.set(type, creator);
  }

  static getPrototypeCreator(type: string): EggPrototypeCreator | undefined {
    return this.creatorMap.get(type);
  }

  static async createProto(clazz: EggProtoImplClass, loadUnit: LoadUnit): Promise<EggPrototype> {
    const property = PrototypeUtil.getProperty(clazz)!;
    const creator = this.getPrototypeCreator(property.protoImplType);
    if (!creator) {
      throw new Error(`not found proto creator for type: ${property.protoImplType}`);
    }
    const ctx: EggPrototypeLifecycleContext = {
      clazz,
      loadUnit,
    };
    const proto = creator(ctx);
    // TODO release egg prototype
    await EggPrototypeLifecycleUtil.objectPreCreate(ctx, proto);
    if (proto.init) {
      await proto.init(ctx);
    }
    await EggPrototypeLifecycleUtil.objectPostCreate(ctx, proto);
    PrototypeUtil.setClazzProto(clazz, proto);
    return proto;
  }
}
