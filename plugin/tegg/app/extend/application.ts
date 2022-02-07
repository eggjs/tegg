import {
  EggPrototype,
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  EggPrototypeLifecycleUtil,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
} from '@eggjs/tegg-metadata';
import {
  AbstractEggContext,
  EggContainerFactory,
  EggObjectFactory,
  LoadUnitInstanceFactory,
  EggContextLifecycleUtil,
  EggObjectLifecycleUtil,
  LoadUnitInstanceLifecycleUtil,
} from '@eggjs/tegg-runtime';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggProtoImplClass, PrototypeUtil, IdenticalUtil } from '@eggjs/tegg';

export default {
  // @eggjs/tegg-metadata should not depend by other egg plugins.
  // May make multi singleton instances.
  // So tegg-compatible should delegate the metadata factories
  // TODO delegate all the singleton
  get eggPrototypeCreatorFactory() {
    return EggPrototypeCreatorFactory;
  },
  get eggPrototypeFactory() {
    return EggPrototypeFactory.instance;
  },

  get loadUnitLifecycleUtil() {
    return LoadUnitLifecycleUtil;
  },

  get loadUnitFactory() {
    return LoadUnitFactory;
  },

  get eggObjectFactory() {
    return EggObjectFactory;
  },

  get loadUnitInstanceFactory() {
    return LoadUnitInstanceFactory;
  },

  get loadUnitInstanceLifecycleUtil() {
    return LoadUnitInstanceLifecycleUtil;
  },

  get eggContainerFactory() {
    return EggContainerFactory;
  },

  get loaderFactory() {
    return LoaderFactory;
  },

  get eggPrototypeLifecycleUtil() {
    return EggPrototypeLifecycleUtil;
  },

  get eggContextLifecycleUtil() {
    return EggContextLifecycleUtil;
  },

  get eggObjectLifecycleUtil() {
    return EggObjectLifecycleUtil;
  },

  get abstractEggContext() {
    return AbstractEggContext;
  },

  get identicalUtil() {
    return IdenticalUtil;
  },

  async getEggObject(clazz: EggProtoImplClass) {
    const proto = PrototypeUtil.getClazzProto(clazz);
    if (!proto) {
      throw new Error(`can not get proto for clazz ${clazz.name}`);
    }
    const eggObject = await EggContainerFactory.getOrCreateEggObject(proto as EggPrototype);
    return eggObject.obj;
  },
};
