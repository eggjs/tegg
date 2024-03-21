import { RDSClient } from '@eggjs/rds';
// TODO fix export
import type { RDSClientOptions } from '@eggjs/rds/lib/types';
import Base from 'sdk-base';

export interface DataSourceOptions extends RDSClientOptions {
  name: string;
  // default is select 1 + 1;
  initSql?: string;
}

const DEFAULT_OPTIONS: RDSClientOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
  trace: true,
};

export class MysqlDataSource extends Base {
  private readonly client: RDSClient;
  private readonly initSql: string;
  readonly name: string;
  readonly timezone?: string;

  constructor(options: DataSourceOptions) {
    super({ initMethod: '_init' });
    const { name, initSql, ...mysqlOptions } = options;
    this.client = new RDSClient(Object.assign({}, DEFAULT_OPTIONS, mysqlOptions));
    this.initSql = initSql ?? 'SELECT 1 + 1';
    this.name = name;
    this.timezone = options.timezone;
  }

  protected async _init() {
    if (this.initSql) {
      await this.client.query(this.initSql);
    }
  }

  async query<T = any>(sql: string): Promise<T> {
    return this.client.query(sql);
  }
}
