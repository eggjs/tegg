import assert from 'node:assert';
import { RDSClient } from '@eggjs/rds';
import { DataSourceOptions } from './MySqlDataSource';
import { DaoLoader } from './DaoLoader';

export class DatabaseForker {
  private readonly env: string;
  private readonly options: DataSourceOptions;

  constructor(env: string, options: DataSourceOptions) {
    this.env = env;
    this.options = options;
  }

  shouldFork() {
    return this.env === 'unittest' && this.options.forkDb;
  }

  async forkDb(moduleDir: string) {
    assert(this.shouldFork(), 'fork db only run in unittest');
    // 尽早判断不应该 fork，避免对 rds pool 配置造成污染
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, initSql, forkDb, database, ...mysqlOptions } = this.options;
    const client = new RDSClient(Object.assign(mysqlOptions));
    const conn = await client.getConnection();
    await this.doCreateUtDb(conn);
    await this.forkTables(conn, moduleDir);
    conn.release();
    await client.end();
  }

  private async forkTables(conn, moduleDir: string) {
    const daoClazzList = DaoLoader.loadDaos(moduleDir);
    for (const clazz of daoClazzList) {
      await this.doForkTable(conn, clazz.tableSql);
    }
  }

  private async doForkTable(conn, sqlFile: string) {
    const sqls = sqlFile.split(';').filter(t => !!t.trim());
    for (const sql of sqls) {
      await conn.query(sql);
    }
  }

  private async doCreateUtDb(conn) {
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${this.options.database};`);
    await conn.query(`use ${this.options.database};`);
  }

  async destroy() {
    assert(this.shouldFork(), 'fork db only run in unittest');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, initSql, forkDb, database, ...mysqlOptions } = this.options;
    const client = new RDSClient(Object.assign(mysqlOptions));
    await client.query(`DROP DATABASE ${database}`);
    await client.end();
  }
}
