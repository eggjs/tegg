import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContext } from '../model/EggContext';
import { EggContainer } from '../model/EggContainer';
import { LifecycleContext } from '@eggjs/tegg-lifecycle';
import { EggObjectName, ObjectInitTypeLike } from '@eggjs/core-decorator';
import { EggObject } from '../model/EggObject';


export type ContainerGetMethod = (proto: EggPrototype, ctx?: EggContext) => EggContainer<LifecycleContext>;

export class EggContainerFactory {
  private static containerGetMethodMap: Map<ObjectInitTypeLike, ContainerGetMethod> = new Map();

  static registerContainerGetMethod(initType: ObjectInitTypeLike, method: ContainerGetMethod) {
    this.containerGetMethodMap.set(initType, method);
  }

  static getContainer(proto: EggPrototype, ctx?: EggContext): EggContainer<LifecycleContext> {
    const method = this.containerGetMethodMap.get(proto.initType);
    if (!method) {
      throw new Error(`InitType ${proto.initType} has not register ContainerGetMethod`);
    }
    return method(proto, ctx);
  }

  static async getOrCreateEggObject(proto: EggPrototype, name?: EggObjectName, ctx?: EggContext): Promise<EggObject> {
    const container = this.getContainer(proto, ctx);
    name = name || proto.name;
    return container.getOrCreateEggObject(name, proto, ctx);
  }

  static getEggObject(proto: EggPrototype, name?: EggObjectName, ctx?: EggContext): EggObject {
    const container = this.getContainer(proto, ctx);
    name = name || proto.name;
    return container.getEggObject(name, proto, ctx);
  }
}
