import { Application } from 'egg';
import { DalTableEggPrototypeHook } from './lib/DalTableEggPrototypeHook';
import { MysqlDataSourceManager } from './lib/MysqlDataSourceManager';
import { SqlMapManager } from './lib/SqlMapManager';
import { TableModelManager } from './lib/TableModelManager';
import { DalModuleLoadUnitHook } from './lib/DalModuleLoadUnitHook';

export default class ControllerAppBootHook {
  private readonly app: Application;
  private readonly dalTableEggPrototypeHook: DalTableEggPrototypeHook;
  private dalModuleLoadUnitHook: DalModuleLoadUnitHook;

  constructor(app: Application) {
    this.app = app;
    this.dalTableEggPrototypeHook = new DalTableEggPrototypeHook(this.app.logger);
  }

  configWillLoad() {
    this.dalModuleLoadUnitHook = new DalModuleLoadUnitHook(this.app.moduleConfigs);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.dalTableEggPrototypeHook);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.dalModuleLoadUnitHook);
  }

  async beforeClose() {
    if (this.dalTableEggPrototypeHook) {
      await this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.dalTableEggPrototypeHook);
    }
    if (this.dalModuleLoadUnitHook) {
      await this.app.loadUnitLifecycleUtil.deleteLifecycle(this.dalModuleLoadUnitHook);
    }
    MysqlDataSourceManager.instance.clear();
    SqlMapManager.instance.clear();
    TableModelManager.instance.clear();
  }
}
