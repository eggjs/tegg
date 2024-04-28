import { BaseDaoType, TableModel } from '@eggjs/tegg/dal';
import type { Logger, SqlMap } from '@eggjs/tegg-types';
import { BaseSqlMapGenerator } from './BaseSqlMap';
import { TableSqlMap } from './TableSqlMap';

export class SqlMapLoader {
  private readonly logger: Logger;
  private readonly tableModel: TableModel;
  private readonly clazzExtension: Record<string, SqlMap>;

  constructor(tableModel: TableModel, baseDaoClazz: BaseDaoType, logger: Logger) {
    this.clazzExtension = baseDaoClazz.clazzExtension;
    this.logger = logger;
    this.tableModel = tableModel;
  }

  load(): TableSqlMap {
    const baseSqlMapGenerator = new BaseSqlMapGenerator(this.tableModel, this.logger);
    const baseSqlMap = baseSqlMapGenerator.load();
    const sqlMap = {
      ...baseSqlMap,
      ...this.clazzExtension,
    };
    return new TableSqlMap(this.tableModel.clazz.name, sqlMap);
  }
}
