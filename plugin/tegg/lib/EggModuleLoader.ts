import { EggLoadUnitType, Loader, LoadUnitFactory, AppGraph, ModuleNode } from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggAppLoader } from './EggAppLoader';
import { Application } from 'egg';

export class EggModuleLoader {
  app: Application;

  constructor(app) {
    this.app = app;
  }

  private async loadApp() {
    const loader = new EggAppLoader(this.app);
    const loadUnit = await LoadUnitFactory.createLoadUnit(this.app.baseDir, EggLoadUnitType.APP, loader);
    this.app.moduleHandler.loadUnits.push(loadUnit);
  }

  private buildAppGraph(loaderCache: Map<string, Loader>) {
    const appGraph = new AppGraph();
    for (const plugin of Object.values(this.app.plugins)) {
      const modulePlugin = this.app.moduleReferences.find(t => t.path === plugin.path);
      if (modulePlugin) {
        modulePlugin.optional = false;
      }
    }
    for (const moduleConfig of this.app.moduleReferences) {
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

  private async loadModule() {
    const loaderCache = new Map<string, Loader>();
    const appGraph = this.buildAppGraph(loaderCache);
    appGraph.sort();
    const moduleConfigList = appGraph.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = loaderCache.get(modulePath)!;
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      this.app.moduleHandler.loadUnits.push(loadUnit);
    }
  }

  async load() {
    await this.loadApp();
    await this.loadModule();
  }
}
