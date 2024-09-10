import { EggLoadUnitType, Loader, LoadUnit, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { AppGraph, ModuleNode } from '@eggjs/tegg/helper';
import { ModuleReference } from '@eggjs/tegg-common-util';

export class EggModuleLoader {
  private moduleReferences: readonly ModuleReference[];

  constructor(moduleReferences: readonly ModuleReference[]) {
    this.moduleReferences = moduleReferences;
  }

  private static generateAppGraph(loaderCache: Map<string, Loader>, moduleReferences: readonly ModuleReference[]) {
    const appGraph = new AppGraph();
    for (const moduleConfig of moduleReferences) {
      const modulePath = moduleConfig.path;
      const moduleNode = new ModuleNode(moduleConfig);
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      loaderCache.set(modulePath, loader);
      const clazzList = loader.load();
      for (const clazz of clazzList) {
        moduleNode.addClazz(clazz);
      }
      appGraph.addNode(moduleNode);
    }
    appGraph.build();
    return appGraph;
  }

  private static async generateLoadUnits(moduleReferences: readonly ModuleReference[]) {
    const loadUnits: LoadUnit[] = [];
    const loaderCache = new Map<string, Loader>();
    const appGraph = EggModuleLoader.generateAppGraph(loaderCache, moduleReferences);
    appGraph.sort();
    const moduleConfigList = appGraph.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = loaderCache.get(modulePath)!;
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      loadUnits.push(loadUnit);
    }
    return loadUnits;
  }

  async load(): Promise<LoadUnit[]> {
    return await EggModuleLoader.generateLoadUnits(this.moduleReferences);
  }

  static async preLoad(moduleReferences: readonly ModuleReference[]): Promise<void> {
    const loads = await EggModuleLoader.generateLoadUnits(moduleReferences);
    for (const load of loads) {
      await load.preLoad?.();
    }
  }
}
