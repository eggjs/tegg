import { LoadUnit, LoadUnitLifecycleContext, LoadUnitLifecycleUtil } from '../model/LoadUnit';
import { EggLoadUnitTypeLike } from '../enum/EggLoadUnitType';
import { Id } from '@eggjs/tegg-lifecycle';
import { Loader } from '../model/Loader';

export type LoadUnitCreator = (ctx: LoadUnitLifecycleContext) => LoadUnit;

interface LoadUnitPair {
  loadUnit: LoadUnit;
  ctx: LoadUnitLifecycleContext;
}

export class LoadUnitFactory {
  private static loadUnitCreatorMap: Map<EggLoadUnitTypeLike, LoadUnitCreator> = new Map();
  private static loadUnitMap: Map<string, LoadUnitPair> = new Map();
  private static loadUnitIdMap: Map<Id, LoadUnit> = new Map();

  static async createLoadUnit(unitPath: string, type: EggLoadUnitTypeLike, loader: Loader): Promise<LoadUnit> {
    if (this.loadUnitMap.has(unitPath)) {
      return this.loadUnitMap.get(unitPath)!.loadUnit;
    }
    const creator = this.loadUnitCreatorMap.get(type);
    if (!creator) {
      throw new Error(`not find creator for load unit type ${type}`);
    }
    const ctx: LoadUnitLifecycleContext = {
      unitPath,
      loader,
    };
    const loadUnit = await creator(ctx);
    await LoadUnitLifecycleUtil.objectPreCreate(ctx, loadUnit);
    if (loadUnit.init) {
      await loadUnit.init(ctx);
    }
    await LoadUnitLifecycleUtil.objectPostCreate(ctx, loadUnit);
    this.loadUnitMap.set(unitPath, { loadUnit, ctx });
    this.loadUnitIdMap.set(loadUnit.id, loadUnit);
    return loadUnit;
  }

  static async destroyLoadUnit(loadUnit: LoadUnit) {
    const { ctx } = this.loadUnitMap.get(loadUnit.unitPath)!;
    try {
      await LoadUnitLifecycleUtil.objectPreDestroy(ctx, loadUnit);
      if (loadUnit.destroy) {
        await loadUnit.destroy(ctx);
      }
    } finally {
      this.loadUnitMap.delete(loadUnit.unitPath);
      this.loadUnitIdMap.delete(loadUnit.id);
    }
  }

  static getLoadUnitById(id: Id): LoadUnit | undefined {
    return this.loadUnitIdMap.get(id);
  }

  static registerLoadUnitCreator(type: EggLoadUnitTypeLike, creator: LoadUnitCreator) {
    this.loadUnitCreatorMap.set(type, creator);
  }
}
