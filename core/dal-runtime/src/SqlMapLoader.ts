import path from 'node:path';
import { TableModel, SqlMap } from '@eggjs/dal-decorator';
import { type EggLogger } from 'egg';
import { BaseSqlMapGenerator } from './BaseSqlMap';
import { TableSqlMap } from './TableSqlMap';

export class SqlMapLoader {
  private readonly logger: EggLogger;
  private readonly tableModel: TableModel;
  private readonly sqlMapPath: string;

  constructor(tableModel: TableModel, moduleDir: string, logger: EggLogger) {
    this.sqlMapPath = path.join(moduleDir, 'dal/extension', `${tableModel.clazz.name}Extension.ts`);
    this.logger = logger;
    this.tableModel = tableModel;
  }

  load(): TableSqlMap {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const customSqlMap: Record<string, SqlMap> = require(this.sqlMapPath);
      const baseSqlMapGenerator = new BaseSqlMapGenerator(this.tableModel, this.logger);
      const baseSqlMap = baseSqlMapGenerator.load();
      const sqlMap = {
        ...baseSqlMap,
        ...customSqlMap,
      };
      return new TableSqlMap(this.tableModel.clazz.name, sqlMap);
    } catch (e) {
      e.message = `load sql map ${this.sqlMapPath} failed: ${e.message}`;
      throw e;
    }
  }
}
