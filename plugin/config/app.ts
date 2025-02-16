import type { Application, IBoot } from 'egg';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import type { ModuleReference } from '@eggjs/tegg-common-util';
import { ModuleScanner } from './lib/ModuleScanner.js';

export default class App implements IBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
    const configNames = this.app.loader.getTypeFiles('module');
    ModuleConfigUtil.setConfigNames(configNames);
  }

  configWillLoad() {
    const { readModuleOptions } = this.app.config.tegg || {};
    const moduleScanner = new ModuleScanner(this.app.baseDir, readModuleOptions);
    this.app.moduleReferences = moduleScanner.loadModuleReferences();

    this.app.moduleConfigs = {};

    for (const reference of this.app.moduleReferences) {
      const absoluteRef: ModuleReference = {
        path: ModuleConfigUtil.resolveModuleDir(reference.path, this.app.baseDir),
        name: reference.name,
        optional: reference.optional,
      };

      const moduleName = ModuleConfigUtil.readModuleNameSync(absoluteRef.path);
      this.app.moduleConfigs[moduleName] = {
        name: moduleName,
        reference: absoluteRef,
        config: ModuleConfigUtil.loadModuleConfigSync(absoluteRef.path),
      };
    }
  }

  async beforeClose() {
    ModuleConfigUtil.setConfigNames(undefined);
  }
}
