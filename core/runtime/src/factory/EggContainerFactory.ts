import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import type {
  ContainerGetMethod,
  EggContainer,
  EggObject,
  EggObjectName,
  EggProtoImplClass,
  EggPrototype,
  LifecycleContext,
  ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { NameUtil } from '@eggjs/tegg-common-util';
import { ContextHandler } from '../model/index.js';
import type { ContextInitiator as ContextInitiatorType } from '../impl/index.js';

export class EggContainerFactory {
  private static containerGetMethodMap: Map<ObjectInitTypeLike, ContainerGetMethod> = new Map();
  private static ContextInitiatorClass: typeof ContextInitiatorType;

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
      if (!EggContainerFactory.ContextInitiatorClass) {
        // Dependency cycle between ContextInitiator and EggContainerFactory
        const { ContextInitiator } = await import('../impl/ContextInitiator.js');
        EggContainerFactory.ContextInitiatorClass = ContextInitiator;
      }
      const initiator = EggContainerFactory.ContextInitiatorClass.createContextInitiator(ctx);
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
