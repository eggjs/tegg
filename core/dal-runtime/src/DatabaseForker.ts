import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert';
import { RDSClient } from '@eggjs/rds';
import { DataSourceOptions } from './MySqlDataSource';

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

  async forkDb(dalDir: string) {
    assert(this.shouldFork(), 'fork db only run in unittest');
    // 尽早判断不应该 fork，避免对 rds pool 配置造成污染
    try {
      await fs.access(dalDir);
    } catch (_) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, initSql, forkDb, database, ...mysqlOptions } = this.options;
    const client = new RDSClient(Object.assign(mysqlOptions));
    const conn = await client.getConnection();
    await this.doCreateUtDb(conn);
    await this.forkTables(conn, dalDir);
    conn.release();
    await client.end();
  }

  private async forkTables(conn, dalDir: string) {
    const sqlDir = path.join(dalDir, 'structure');
    const structureFiles = await fs.readdir(sqlDir);
    const sqlFiles = structureFiles.filter(t => t.endsWith('.sql'));
    for (const sqlFile of sqlFiles) {
      await this.doForkTable(conn, path.join(sqlDir, sqlFile));
    }
  }

  private async doForkTable(conn, sqlFileName: string) {
    const sqlFile = await fs.readFile(sqlFileName, 'utf8');
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
