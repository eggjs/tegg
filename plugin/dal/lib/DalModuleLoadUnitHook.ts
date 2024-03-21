import { MysqlDataSourceManager } from './MysqlDataSourceManager';
import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { ModuleConfigHolder } from '@eggjs/tegg-common-util';
import { DataSourceOptions } from '@eggjs/dal-runtime';
import { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg/helper';

export class DalModuleLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly moduleConfigs: Record<string, ModuleConfigHolder>;

  constructor(moduleConfigs: Record<string, ModuleConfigHolder>) {
    this.moduleConfigs = moduleConfigs;
  }

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const moduleConfigHolder = this.moduleConfigs[loadUnit.name];
    if (!moduleConfigHolder) return;
    const dataSourceConfig: Record<string, DataSourceOptions> | undefined = (moduleConfigHolder.config as any).dataSource;
    if (!dataSourceConfig) return;
    await Promise.all(Object.entries(dataSourceConfig).map(async ([ name, config ]) => {
      try {
        await MysqlDataSourceManager.instance.createDataSource(loadUnit.name, name, {
          ...config,
          name,
        });
      } catch (e) {
        e.message = `create module ${loadUnit.name} datasource ${name} failed: ` + e.message;
        throw e;
      }
    }));
  }
}
