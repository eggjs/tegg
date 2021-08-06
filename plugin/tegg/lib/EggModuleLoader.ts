import { EggLoadUnitType, Loader, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggAppLoader } from './EggAppLoader';
import { Application } from 'egg';
import { AppGraph, ModuleNode } from './AppGraph';
import {
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  PrototypeUtil,
  QualifierUtil,
} from '@eggjs/tegg';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';

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
    for (const moduleConfig of this.app.moduleReferences) {
      const modulePath = moduleConfig.path;
      const moduleNode = new ModuleNode(moduleConfig);
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      loaderCache.set(modulePath, loader);
      const clazzList = loader.load();
      for (const clazz of clazzList) {
        // TODO copy from ModuleLoadUnit, duplicate code
        const moduleName = ModuleConfigUtil.readModuleNameSync(modulePath);
        const property = PrototypeUtil.getProperty(clazz)!;
        const defaultQualifier = [{
          attribute: InitTypeQualifierAttribute,
          value: property.initType,
        }, {
          attribute: LoadUnitNameQualifierAttribute,
          value: moduleName,
        }];
        defaultQualifier.forEach(qualifier => {
          QualifierUtil.addProtoQualifier(clazz, qualifier.attribute, qualifier.value);
        });
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
