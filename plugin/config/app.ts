import { Application } from 'egg';
import { ModuleConfigUtil, ModuleReference } from '@eggjs/tegg-common-util';
import { ModuleScanner } from './lib/ModuleScanner';

export default class App {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
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
        config: ModuleConfigUtil.loadModuleConfigSync(absoluteRef.path, undefined, this.app.config.env) || {},
      };
    }
  }
}
