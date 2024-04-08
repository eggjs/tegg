import path from 'node:path';
import { TableModel, SqlMap } from '@eggjs/dal-decorator';
import { Logger } from '@eggjs/tegg';
import { BaseSqlMapGenerator } from './BaseSqlMap';
import { TableSqlMap } from './TableSqlMap';
import { LoaderUtil } from '@eggjs/tegg/helper';

export class SqlMapLoader {
  private readonly logger: Logger;
  private readonly tableModel: TableModel;
  private readonly sqlMapPath: string;

  constructor(tableModel: TableModel, moduleDir: string, logger: Logger) {
    this.sqlMapPath = path.join(moduleDir, 'dal/extension', `${tableModel.clazz.name}Extension${LoaderUtil.extension}`);
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
