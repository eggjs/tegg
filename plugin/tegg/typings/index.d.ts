import { Application, Context } from 'egg';
import '@eggjs/tegg-config';
import { ModuleHandler } from '../lib/ModuleHandler';
import { EggPrototypeCreatorFactory } from '@eggjs/tegg-metadata';
import {
  EggPrototypeFactory,
  LoadUnitLifecycleUtil,
  LoadUnitFactory,
  EggPrototypeLifecycleUtil,
} from '@eggjs/tegg-metadata';
import {
  EggContainerFactory,
  LoadUnitInstanceFactory,
  LoadUnitInstanceLifecycleUtil,
  EggContextLifecycleUtil,
  EggObjectLifecycleUtil,
  AbstractEggContext,
  EggObjectFactory,
  EggContext,
} from '@eggjs/tegg-runtime';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { IdenticalUtil, EggProtoImplClass } from '@eggjs/tegg';
import { AsyncLocalStorage } from 'async_hooks';

declare module 'egg' {
  export interface EggModule {
  }

  export interface EggContextModule {
  }

  export interface EggApplicationModule {
  }

  export interface TEggApplication {
    eggPrototypeCreatorFactory: typeof EggPrototypeCreatorFactory;
    eggPrototypeFactory: EggPrototypeFactory;
    eggContainerFactory: typeof EggContainerFactory;
    loadUnitFactory: typeof LoadUnitFactory;
    eggObjectFactory: typeof EggObjectFactory;
    loadUnitInstanceFactory: typeof LoadUnitInstanceFactory;
    abstractEggContext: typeof AbstractEggContext;
    identicalUtil: typeof IdenticalUtil;
    loaderFactory: typeof LoaderFactory;

    loadUnitLifecycleUtil: typeof LoadUnitLifecycleUtil;
    loadUnitInstanceLifecycleUtil: typeof LoadUnitInstanceLifecycleUtil;
    eggPrototypeLifecycleUtil: typeof EggPrototypeLifecycleUtil;
    eggContextLifecycleUtil: typeof EggContextLifecycleUtil;
    eggObjectLifecycleUtil: typeof EggObjectLifecycleUtil;
    teggContextStorage(): AsyncLocalStorage<EggContext>

    moduleHandler: ModuleHandler;

    mockModuleContext(data?: any): Promise<Context>;
    destroyModuleContext(context: Context): Promise<void>;
    // 兼容现有 module 的定义
    module: EggModule & EggApplicationModule;

    getEggObject<T>(clazz: EggProtoImplClass<T>): Promise<T>;
  }

  export interface TEggContext {
    beginModuleScope(func: () => Promise<void>): Promise<void>;
    // 兼容现有 module 的定义
    module: EggModule & EggContextModule;

    getEggObject<T>(clazz: EggProtoImplClass<T>): Promise<T>;
  }

  interface Application extends TEggApplication {
  }

  interface Context extends TEggContext {
  }
}
