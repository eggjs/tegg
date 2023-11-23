import { EggPrototype, EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { EggContainer } from '../model/EggContainer';
import { LifecycleContext } from '@eggjs/tegg-lifecycle';
import {
  EggObjectName,
  ObjectInitTypeLike,
  PrototypeUtil,
  EggProtoImplClass,
  QualifierInfo,
} from '@eggjs/core-decorator';
import { EggObject } from '../model/EggObject';
import { ContextHandler } from '../model/ContextHandler';
import { ContextInitiator } from '../impl/ContextInitiator';
import { NameUtil } from '@eggjs/tegg-common-util';

export type ContainerGetMethod = (proto: EggPrototype) => EggContainer<LifecycleContext>;

export class EggContainerFactory {
  private static containerGetMethodMap: Map<ObjectInitTypeLike, ContainerGetMethod> = new Map();

  static registerContainerGetMethod(initType: ObjectInitTypeLike, method: ContainerGetMethod) {
    this.containerGetMethodMap.set(initType, method);
  }

  static getContainer(proto: EggPrototype): EggContainer<LifecycleContext> {
    const method = this.containerGetMethodMap.get(proto.initType);
    if (!method) {
      throw new Error(`InitType ${proto.initType} has not register ContainerGetMethod`);
    }
    return method(proto);
  }

  /**
   * get or create egg object
   * If get singleton egg object in context,
   * will create context egg object for it.
   */
  static async getOrCreateEggObject(proto: EggPrototype, name?: EggObjectName): Promise<EggObject> {
    const container = this.getContainer(proto);
    name = name || proto.name;
    const obj = await container.getOrCreateEggObject(name, proto);
    const ctx = ContextHandler.getContext();
    if (ctx) {
      const initiator = ContextInitiator.createContextInitiator(ctx);
      await initiator.init(obj);
    }
    return obj;
  }

  /**
   * get or create egg object from the Class
   * If get singleton egg object in context,
   * will create context egg object for it.
   */
  static async getOrCreateEggObjectFromClazz(clazz: EggProtoImplClass, name?: EggObjectName, qualifiers?: QualifierInfo[]): Promise<EggObject> {
    let proto = PrototypeUtil.getClazzProto(clazz as EggProtoImplClass) as EggPrototype | undefined;
    if (PrototypeUtil.isEggMultiInstancePrototype(clazz as EggProtoImplClass)) {
      const defaultName = NameUtil.getClassName(clazz as EggProtoImplClass);
      name = name ?? defaultName;
      proto = EggPrototypeFactory.instance.getPrototype(name, undefined, qualifiers);
    } else if (proto) {
      name = name ?? proto.name;
    }
    if (!proto) {
      throw new Error(`can not get proto for clazz ${clazz.name}`);
    }
    return await this.getOrCreateEggObject(proto, name);
  }

  /**
   * get or create egg object from the Name
   * If get singleton egg object in context,
   * will create context egg object for it.
   */
  static async getOrCreateEggObjectFromName(name: EggObjectName, qualifiers?: QualifierInfo[]): Promise<EggObject> {
    const proto = EggPrototypeFactory.instance.getPrototype(name, undefined, qualifiers);
    if (!proto) {
      throw new Error(`can not get proto for clazz ${String(name)}`);
    }
    return await this.getOrCreateEggObject(proto, name);
  }

  static getEggObject(proto: EggPrototype, name?: EggObjectName): EggObject {
    const container = this.getContainer(proto);
    name = name || proto.name;
    return container.getEggObject(name, proto);
  }
}
