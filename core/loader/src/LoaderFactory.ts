import {
  EggLoadUnitType,
  EggLoadUnitTypeLike,
  EggProtoImplClass,
  LoadAsyncOptions,
  Loader,
  ModuleReference,
} from '@eggjs/tegg-types';
import { ModuleDescriptor } from '@eggjs/tegg-metadata';
import { PrototypeUtil } from '@eggjs/core-decorator';

export type LoaderCreator = (unitPath: string) => Loader;

export const DEFAULT_ASYNC_LOAD_YIELD_INTERVAL_MS = 50;

export class LoaderFactory {
  private static loaderCreatorMap: Map<EggLoadUnitTypeLike, LoaderCreator> = new Map();

  static createLoader(unitPath: string, type: EggLoadUnitTypeLike): Loader {
    const creator = this.loaderCreatorMap.get(type);
    if (!creator) {
      throw new Error(`not find creator for loader type ${type}`);
    }
    return creator(unitPath);
  }

  static registerLoader(type: EggLoadUnitTypeLike, creator: LoaderCreator) {
    this.loaderCreatorMap.set(type, creator);
  }

  private static createModuleDescriptor(
    moduleReference: ModuleReference,
    multiInstanceClazzList: EggProtoImplClass[],
  ): ModuleDescriptor {
    return {
      name: moduleReference.name,
      unitPath: moduleReference.path,
      clazzList: [],
      protos: [],
      multiInstanceClazzList,
      optional: moduleReference.optional,
    };
  }

  private static collectClazzList(clazzList: EggProtoImplClass[], descriptor: ModuleDescriptor) {
    for (const clazz of clazzList) {
      if (PrototypeUtil.isEggPrototype(clazz)) {
        descriptor.clazzList.push(clazz);
      } else if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
        descriptor.multiInstanceClazzList.push(clazz);
      }
    }
  }

  static loadApp(moduleReferences: readonly ModuleReference[]): ModuleDescriptor[] {
    const result: ModuleDescriptor[] = [];
    const multiInstanceClazzList: EggProtoImplClass[] = [];
    for (const moduleReference of moduleReferences) {
      const loader = LoaderFactory.createLoader(moduleReference.path, moduleReference.loaderType || EggLoadUnitType.MODULE);
      const descriptor = LoaderFactory.createModuleDescriptor(moduleReference, multiInstanceClazzList);
      result.push(descriptor);
      const clazzList = loader.load();
      LoaderFactory.collectClazzList(clazzList, descriptor);
    }
    return result;
  }

  static async loadAppAsync(
    moduleReferences: readonly ModuleReference[],
    options?: LoadAsyncOptions,
  ): Promise<ModuleDescriptor[]> {
    const result: ModuleDescriptor[] = [];
    const multiInstanceClazzList: EggProtoImplClass[] = [];
    for (const moduleReference of moduleReferences) {
      const loader = LoaderFactory.createLoader(moduleReference.path, moduleReference.loaderType || EggLoadUnitType.MODULE);
      const descriptor = LoaderFactory.createModuleDescriptor(moduleReference, multiInstanceClazzList);
      result.push(descriptor);
      const clazzList = loader.loadAsync ? await loader.loadAsync(options) : loader.load();
      LoaderFactory.collectClazzList(clazzList, descriptor);
    }
    return result;
  }
}
