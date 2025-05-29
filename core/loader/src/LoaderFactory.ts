import { EggLoadUnitType, EggLoadUnitTypeLike, EggProtoImplClass, Loader, ModuleReference } from '@eggjs/tegg-types';
import { ModuleDescriptor } from '@eggjs/tegg-metadata';
import { PrototypeUtil } from '@eggjs/core-decorator';

export type LoaderCreator = (unitPath: string) => Loader;

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

  static loadApp(moduleReferences: readonly ModuleReference[]): ModuleDescriptor[] {
    const result: ModuleDescriptor[] = [];
    const multiInstanceClazzList: EggProtoImplClass[] = [];
    for (const moduleReference of moduleReferences) {
      const module = LoaderFactory.loadModule(moduleReference, multiInstanceClazzList);
      result.push(module);
    }
    return result;
  }

  static loadModule(moduleReference: ModuleReference, multiInstanceClazzList?: EggProtoImplClass[]): ModuleDescriptor {
    const loader = LoaderFactory.createLoader(moduleReference.path, moduleReference.loaderType || EggLoadUnitType.MODULE);

    const res: ModuleDescriptor = {
      name: moduleReference.name,
      unitPath: moduleReference.path,
      clazzList: [],
      protos: [],
      multiInstanceClazzList: multiInstanceClazzList || [],
      innerObjectClazzList: [],
      optional: moduleReference.optional,
    };

    const clazzList = loader.load();
    for (const clazz of clazzList) {
      if (PrototypeUtil.isEggInnerObject(clazz)) {
        res.innerObjectClazzList?.push(clazz);
      } else if (PrototypeUtil.isEggPrototype(clazz)) {
        res.clazzList.push(clazz);
      } else if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
        res.multiInstanceClazzList.push(clazz);
      }
    }

    return res;
  }
}
