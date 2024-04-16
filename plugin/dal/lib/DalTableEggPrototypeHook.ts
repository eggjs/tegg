import { Logger, LifecycleHook } from '@eggjs/tegg';
import { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg/helper';
import { TableInfoUtil, TableModel } from '@eggjs/dal-decorator';
import { SqlMapLoader } from '@eggjs/dal-runtime';
import { TableModelManager } from './TableModelManager';
import { SqlMapManager } from './SqlMapManager';

export class DalTableEggPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async preCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    if (!TableInfoUtil.getIsTable(ctx.clazz)) return;
    const tableModel = TableModel.build(ctx.clazz);
    TableModelManager.instance.set(ctx.loadUnit.name, tableModel);
    const loader = new SqlMapLoader(tableModel, ctx.loadUnit.unitPath, this.logger);
    const sqlMap = loader.load();
    SqlMapManager.instance.set(ctx.loadUnit.name, sqlMap);
  }
}
