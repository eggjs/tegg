import { Application } from 'egg';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';

export default class App {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    const { readModuleOptions } = this.app.config.tegg || {};
    this.app.moduleReferences = ModuleConfigUtil.readModuleReference(this.app.baseDir, readModuleOptions || {});
    this.app.moduleConfigs = {};
    for (const reference of this.app.moduleReferences) {
      const absoluteRef = {
        path: ModuleConfigUtil.resolveModuleDir(reference.path, this.app.baseDir),
      };

      const moduleName = ModuleConfigUtil.readModuleNameSync(absoluteRef.path);
      this.app.moduleConfigs[moduleName] = {
        name: moduleName,
        reference: absoluteRef,
        config: ModuleConfigUtil.loadModuleConfigSync(absoluteRef.path) || {},
      };
    }
  }
}
