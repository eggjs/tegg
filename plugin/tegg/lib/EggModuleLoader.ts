import {
  EggLoadUnitType,
  LoadUnitFactory,
  GlobalGraph, GlobalGraphBuildHook, ModuleDescriptor, ModuleDescriptorDumper,
} from '@eggjs/tegg-metadata';
import { DEFAULT_ASYNC_LOAD_YIELD_INTERVAL_MS, LoaderFactory } from '@eggjs/tegg-loader';
import { EggAppLoader } from './EggAppLoader';
import { Application } from 'egg';

export class EggModuleLoader {
  app: Application;
  globalGraph: GlobalGraph;
  private readonly asyncLoad: boolean;
  private pendingBuildHooks: GlobalGraphBuildHook[] = [];
  private initGraphPromise?: Promise<void>;

  constructor(app) {
    this.app = app;
    this.asyncLoad = this.app.config.tegg?.asyncLoad === true;
    if (!this.asyncLoad) {
      GlobalGraph.instance = this.globalGraph = this.buildAppGraph();
    }
  }

  registerBuildHook(hook: GlobalGraphBuildHook) {
    if (this.globalGraph) {
      this.globalGraph.registerBuildHook(hook);
      return;
    }
    this.pendingBuildHooks.push(hook);
  }

  private async loadApp() {
    const loader = new EggAppLoader(this.app);
    const loadUnit = await LoadUnitFactory.createLoadUnit(this.app.baseDir, EggLoadUnitType.APP, loader);
    this.app.moduleHandler.loadUnits.push(loadUnit);
  }

  private prepareModuleReferences() {
    for (const plugin of Object.values(this.app.plugins)) {
      if (!plugin.enable) continue;
      const modulePlugin = this.app.moduleReferences.find(t => t.path === plugin.path);
      if (modulePlugin) {
        modulePlugin.optional = false;
      }
    }
  }

  private createGraph(moduleDescriptors: ModuleDescriptor[]): GlobalGraph {
    for (const moduleDescriptor of moduleDescriptors) {
      ModuleDescriptorDumper.dump(moduleDescriptor, {
        dumpDir: this.app.baseDir,
      }).catch(e => {
        e.message = 'dump module descriptor failed: ' + e.message;
        this.app.logger.warn(e);
      });
    }
    return GlobalGraph.create(moduleDescriptors);
  }

  private buildAppGraph(): GlobalGraph {
    this.prepareModuleReferences();
    return this.createGraph(LoaderFactory.loadApp(this.app.moduleReferences));
  }

  private async buildAppGraphAsync(): Promise<GlobalGraph> {
    this.prepareModuleReferences();
    const yieldIntervalMs = this.app.config.tegg?.asyncLoadYieldIntervalMs ?? DEFAULT_ASYNC_LOAD_YIELD_INTERVAL_MS;
    return this.createGraph(await LoaderFactory.loadAppAsync(this.app.moduleReferences, { yieldIntervalMs }));
  }

  private async loadModule() {
    this.globalGraph.build();
    this.globalGraph.sort();
    const moduleConfigList = this.globalGraph.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      this.app.moduleHandler.loadUnits.push(loadUnit);
    }
  }

  private async doInitGraph() {
    GlobalGraph.instance = this.globalGraph = await this.buildAppGraphAsync();
    for (const hook of this.pendingBuildHooks) {
      this.globalGraph.registerBuildHook(hook);
    }
    this.pendingBuildHooks = [];
  }

  async initGraph() {
    if (this.globalGraph) return;
    if (!this.initGraphPromise) {
      this.initGraphPromise = this.doInitGraph();
    }
    await this.initGraphPromise;
  }

  async load() {
    await this.initGraph();
    await this.loadApp();
    await this.loadModule();
  }
}
