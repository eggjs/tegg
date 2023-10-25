import type { EggLoadUnitTypeLike, Loader } from '@eggjs/tegg-metadata';

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
}
