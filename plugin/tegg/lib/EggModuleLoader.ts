import {
  EggLoadUnitType,
  LoadUnitFactory,
  GlobalGraph, ModuleDescriptorDumper,
} from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggAppLoader } from './EggAppLoader';
import { Application } from 'egg';

export class EggModuleLoader {
  app: Application;
  globalGraph: GlobalGraph;

  constructor(app) {
    this.app = app;
    GlobalGraph.instance = this.globalGraph = this.buildAppGraph();
  }

  private async loadApp() {
    const loader = new EggAppLoader(this.app);
    const loadUnit = await LoadUnitFactory.createLoadUnit(this.app.baseDir, EggLoadUnitType.APP, loader);
    this.app.moduleHandler.loadUnits.push(loadUnit);
  }

  private buildAppGraph() {
    for (const plugin of Object.values(this.app.plugins)) {
      if (!plugin.enable) continue;
      const modulePlugin = this.app.moduleReferences.find(t => t.path === plugin.path);
      if (modulePlugin) {
        modulePlugin.optional = false;
      }
    }
    const moduleDescriptors = LoaderFactory.loadApp(this.app.moduleReferences);
    for (const moduleDescriptor of moduleDescriptors) {
      ModuleDescriptorDumper.dump(moduleDescriptor, {
        dumpDir: this.app.baseDir,
      }).catch(e => {
        e.message = 'dump module descriptor failed: ' + e.message;
        this.app.logger.warn(e);
      });
    }
    const graph = GlobalGraph.create(moduleDescriptors);
    return graph;
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

  async load() {
    await this.loadApp();
    await this.loadModule();
  }
}
