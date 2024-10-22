import {
  EggLoadUnitType,
  GlobalGraph,
  Loader,
  LoadUnit,
  LoadUnitFactory,
  ModuleDescriptorDumper,
} from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { ModuleReference } from '@eggjs/tegg-common-util';
import { Logger } from '@eggjs/tegg';

export interface EggModuleLoaderOptions {
  logger: Logger;
  baseDir: string;
  dump?: boolean;
}

export class EggModuleLoader {
  private moduleReferences: readonly ModuleReference[];
  private globalGraph: GlobalGraph;

  constructor(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions) {
    this.moduleReferences = moduleReferences;
    GlobalGraph.instance = this.globalGraph = EggModuleLoader.generateAppGraph(this.moduleReferences, options);
  }

  private static generateAppGraph(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions) {
    const moduleDescriptors = LoaderFactory.loadApp(moduleReferences);
    if (options.dump) {
      for (const moduleDescriptor of moduleDescriptors) {
        ModuleDescriptorDumper.dump(moduleDescriptor, {
          dumpDir: options.baseDir,
        }).catch(e => {
          e.message = 'dump module descriptor failed: ' + e.message;
          options.logger.warn(e);
        });
      }
    }
    const globalGraph = GlobalGraph.create(moduleDescriptors);
    return globalGraph;
  }

  async load(): Promise<LoadUnit[]> {
    const loadUnits: LoadUnit[] = [];
    this.globalGraph.build();
    this.globalGraph.sort();
    const moduleConfigList = GlobalGraph.instance!.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      loadUnits.push(loadUnit);
    }
    return loadUnits;
  }

  static async preLoad(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions): Promise<void> {
    const loadUnits: LoadUnit[] = [];
    const loaderCache = new Map<string, Loader>();
    const globalGraph = GlobalGraph.instance = EggModuleLoader.generateAppGraph(moduleReferences, options);
    globalGraph.sort();
    const moduleConfigList = globalGraph.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = loaderCache.get(modulePath)!;
      const loadUnit = await LoadUnitFactory.createPreloadLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      loadUnits.push(loadUnit);
    }
    for (const load of loadUnits) {
      await load.preLoad?.();
    }
  }
}
