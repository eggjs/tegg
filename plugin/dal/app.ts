import { Application, ILifecycleBoot } from 'egg';

import { DalTableEggPrototypeHook } from './lib/DalTableEggPrototypeHook.js';
import { MysqlDataSourceManager } from './lib/MysqlDataSourceManager.js';
import { SqlMapManager } from './lib/SqlMapManager.js';
import { TableModelManager } from './lib/TableModelManager.js';
import { DalModuleLoadUnitHook } from './lib/DalModuleLoadUnitHook.js';
import { TransactionPrototypeHook } from './lib/TransactionPrototypeHook.js';

export default class DalAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private dalTableEggPrototypeHook: DalTableEggPrototypeHook;
  private dalModuleLoadUnitHook: DalModuleLoadUnitHook;
  private transactionPrototypeHook: TransactionPrototypeHook;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    this.dalModuleLoadUnitHook = new DalModuleLoadUnitHook(this.app.config.env, this.app.moduleConfigs);
    this.dalTableEggPrototypeHook = new DalTableEggPrototypeHook(this.app.logger);
    this.transactionPrototypeHook = new TransactionPrototypeHook(this.app.moduleConfigs, this.app.logger);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.dalTableEggPrototypeHook);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.transactionPrototypeHook);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.dalModuleLoadUnitHook);
  }

  async beforeClose() {
    if (this.dalTableEggPrototypeHook) {
      this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.dalTableEggPrototypeHook);
    }
    if (this.dalModuleLoadUnitHook) {
      this.app.loadUnitLifecycleUtil.deleteLifecycle(this.dalModuleLoadUnitHook);
    }
    if (this.transactionPrototypeHook) {
      this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.transactionPrototypeHook);
    }
    MysqlDataSourceManager.instance.clear();
    SqlMapManager.instance.clear();
    TableModelManager.instance.clear();
  }
}
