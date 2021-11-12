import { EggLoadUnitType, Loader, LoadUnit, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { StandaloneGraph, ModuleNode } from './StandaloneGraph';
import {
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  PrototypeUtil,
  QualifierUtil,
} from '@eggjs/tegg';
import { ModuleConfigUtil, ModuleReference } from '@eggjs/tegg-common-util';

export class EggModuleLoader {
  private moduleReferences: readonly ModuleReference[];

  constructor(moduleReferences: readonly ModuleReference[]) {
    this.moduleReferences = moduleReferences;
  }

  private buildAppGraph(loaderCache: Map<string, Loader>) {
    const appGraph = new StandaloneGraph();
    for (const moduleConfig of this.moduleReferences) {
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

  async load(): Promise<LoadUnit[]> {
    const loadUnits: LoadUnit[] = [];
    const loaderCache = new Map<string, Loader>();
    const appGraph = this.buildAppGraph(loaderCache);
    appGraph.sort();
    const moduleConfigList = appGraph.moduleConfigList;
        for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = loaderCache.get(modulePath)!;
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      loadUnits.push(loadUnit);
    }
    return loadUnits;
    // return loadUnits;
  }
}
