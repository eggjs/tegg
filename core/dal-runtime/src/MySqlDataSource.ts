import { RDSClient } from '@eggjs/rds';
import type { RDSClientOptions } from '@eggjs/rds';
import Base from 'sdk-base';

export interface DataSourceOptions extends RDSClientOptions {
  name: string;
  // default is select 1 + 1;
  initSql?: string;
  forkDb?: boolean;
}

const DEFAULT_OPTIONS: RDSClientOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
  trace: true,
};

export class MysqlDataSource extends Base {
  private client: RDSClient;
  private readonly initSql: string;
  readonly name: string;
  readonly timezone?: string;
  readonly rdsOptions: RDSClientOptions;
  readonly forkDb?: boolean;

  constructor(options: DataSourceOptions) {
    super({ initMethod: '_init' });
    const { name, initSql, forkDb, ...mysqlOptions } = options;
    this.forkDb = forkDb;
    this.initSql = initSql ?? 'SELECT 1 + 1';
    this.name = name;
    this.timezone = options.timezone;
    this.rdsOptions = Object.assign({}, DEFAULT_OPTIONS, mysqlOptions);
    this.client = new RDSClient(this.rdsOptions);
  }

  protected async _init() {
    if (this.initSql) {
      await this.client.query(this.initSql);
    }
  }

  async query<T = any>(sql: string): Promise<T> {
    return this.client.query(sql);
  }

  async beginTransactionScope<T>(scope: () => Promise<T>): Promise<T> {
    return await this.client.beginTransactionScope(scope);
  }
}
