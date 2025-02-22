import '@eggjs/tegg-config';
import {
  EggPrototypeCreatorFactory,
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
  EggContext as TEggContext,
} from '@eggjs/tegg-runtime';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { IdenticalUtil, QualifierInfo } from '@eggjs/tegg';
import { ModuleHandler } from '../lib/ModuleHandler.js';
import { EggContextHandler } from '../lib/EggContextHandler.js';

declare module '@eggjs/core' {
  export interface EggModule {
  }

  export interface EggCore {
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
    teggContext: TEggContext;
    moduleHandler: ModuleHandler;
    eggContextHandler: EggContextHandler;

    mockModuleContext(data?: any): Promise<Context>;
    mockModuleContextScope<R=any>(fn: (ctx: Context) => Promise<R>, data?: any): Promise<R>;
    destroyModuleContext(context: Context): Promise<void>;

    // getEggObject<T>(clazz: EggProtoImplClass<T>, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    getEggObject<T>(clazz: new (...args: any[]) => T, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    getEggObjectFromName<T extends object>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;

    module: EggModule;
  }

  interface Context {
    beginModuleScope(func: () => Promise<void>): Promise<void>;
    // getEggObject<T>(clazz: EggProtoImplClass<T>, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    getEggObject<T>(clazz: new (...args: any[]) => T, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    getEggObjectFromName<T>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    teggContext: TEggContext;

    module: EggModule;
  }
}
