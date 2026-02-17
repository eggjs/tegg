import { TableModel } from '@eggjs/dal-decorator';
import type { DataSource as IDataSource, PaginateData, SqlType } from '@eggjs/tegg-types';

import type { EggQueryOptions } from './MySqlDataSource.ts';
import { MysqlDataSource } from './MySqlDataSource.ts';
import { TableSqlMap } from './TableSqlMap.ts';
import { TableModelInstanceBuilder } from './TableModelInstanceBuilder.ts';

export interface ExecuteSql {
  sql: string;
  params: any[];
  template: string;
  sqlType: SqlType;
}

const PAGINATE_COUNT_WRAPPER = [ 'SELECT COUNT(0) as count FROM (', ') AS T' ];

export class DataSource<T> implements IDataSource<T> {
  private readonly tableModel: TableModel<T>;
  private readonly mysqlDataSource: MysqlDataSource;
  private readonly sqlMap: TableSqlMap;

  constructor(tableModel: TableModel<T>, mysqlDataSource: MysqlDataSource, sqlMap: TableSqlMap) {
    this.tableModel = tableModel;
    this.mysqlDataSource = mysqlDataSource;
    this.sqlMap = sqlMap;
  }

  /**
   * public for aop execute to implement sql hint append
   * @param sqlName - sql name
   * @param data - sql data
   */
  async generateSql(sqlName: string, data: object): Promise<ExecuteSql> {
    const { sql, params } = this.sqlMap.generate(sqlName, data, this.mysqlDataSource.timezone!);
    const sqlType = this.sqlMap.getType(sqlName);
    const template = this.sqlMap.getTemplateString(sqlName);
    return {
      sql,
      params,
      sqlType,
      template,
    };
  }

  async count(sqlName: string, data?: any): Promise<number> {
    const newData = Object.assign({ $$count: true }, data);
    const executeSql = await this.generateSql(sqlName, newData);
    return await this.#paginateCount(executeSql.sql, executeSql.params);
  }

  async execute(sqlName: string, data?: any, options?: EggQueryOptions): Promise<Array<T>> {
    const executeSql = await this.generateSql(sqlName, data);
    const rows = await this.mysqlDataSource.query(executeSql.sql, executeSql.params, options);
    return rows.map((t: any) => {
      return TableModelInstanceBuilder.buildInstance(this.tableModel, t);
    });
  }

  async executeRaw(sqlName: string, data?: any, options?: EggQueryOptions): Promise<Array<any>> {
    const executeSql = await this.generateSql(sqlName, data);
    return await this.mysqlDataSource.query(executeSql.sql, executeSql.params, options);
  }

  async executeScalar(sqlName: string, data?: any, options?: EggQueryOptions): Promise<T | null> {
    const ret = await this.execute(sqlName, data, options);
    if (!Array.isArray(ret)) return ret || null;
    return ret[0] || null;
  }

  async executeRawScalar(sqlName: string, data?: any, options?: EggQueryOptions): Promise<any | null> {
    const ret = await this.executeRaw(sqlName, data, options);
    if (!Array.isArray(ret)) return (ret || null) as any;
    return ret[0] || null;
  }

  async paginate(sqlName: string, data: any, currentPage: number, perPageCount: number, options?: EggQueryOptions): Promise<PaginateData<T>> {
    const limit = `LIMIT ${(currentPage - 1) * perPageCount}, ${perPageCount}`;
    const generated = await this.generateSql(sqlName, data);
    const sql = generated.sql + ' ' + limit;
    const countGenerated = await this.generateSql(sqlName, Object.assign({ $$count: true }, data));


    const ret = await Promise.all([
      this.mysqlDataSource.query(sql, generated.params, options),
      this.#paginateCount(countGenerated.sql, countGenerated.params),
    ]);

    return {
      total: Number(ret[1]),
      pageNum: currentPage,
      rows: ret[0].map((t: any) => TableModelInstanceBuilder.buildInstance(this.tableModel, t)),
    };
  }

  async #paginateCount(baseSQL: string, params?: any[]): Promise<number> {
    const sql = `${PAGINATE_COUNT_WRAPPER[0]}${baseSQL}${PAGINATE_COUNT_WRAPPER[1]}`;

    const result = await this.mysqlDataSource.query(sql, params);

    return result[0].count;
  }
}
