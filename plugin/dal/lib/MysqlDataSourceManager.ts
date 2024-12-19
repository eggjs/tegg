import { DataSourceOptions, MysqlDataSource } from '@eggjs/dal-runtime';
import crypto from 'node:crypto';

export class MysqlDataSourceManager {
  static instance = new MysqlDataSourceManager();

  private readonly dataSourceIndices: Map<string/* moduleName */, Map<string/* dataSourceName */, string/* dataSourceIndex */>>;
  private readonly dataSources: Map<string/* dataSourceIndex */, MysqlDataSource>;

  constructor() {
    this.dataSourceIndices = new Map();
    this.dataSources = new Map();
  }

  get(moduleName: string, dataSourceName: string): MysqlDataSource | undefined {
    const dataSourceIndex = this.dataSourceIndices.get(moduleName)
      ?.get(dataSourceName);
    if (dataSourceIndex) {
      return this.dataSources.get(dataSourceIndex);
    }
  }

  async createDataSource(moduleName: string, dataSourceName: string, config: DataSourceOptions) {
    const { logger, ...dsConfig } = config || {};
    const dataSourceConfig = {
      ...dsConfig,
      name: dataSourceName,
    };
    const index = MysqlDataSourceManager.createDataSourceKey(dataSourceConfig);
    let dataSource = this.dataSources.get(index);
    if (!dataSource) {
      dataSource = new MysqlDataSource({ ...dataSourceConfig, logger });
      this.dataSources.set(index, dataSource);
    }
    let moduledataSourceIndices = this.dataSourceIndices.get(moduleName);
    if (!moduledataSourceIndices) {
      moduledataSourceIndices = new Map();
      this.dataSourceIndices.set(moduleName, moduledataSourceIndices);
    }
    moduledataSourceIndices.set(dataSourceName, index);

    await dataSource.ready();
  }

  clear() {
    this.dataSourceIndices.clear();
  }

  static createDataSourceKey(dataSourceOptions: DataSourceOptions): string {
    const hash = crypto.createHash('md5');
    const keys = Object.keys(dataSourceOptions)
      .sort();
    for (const key of keys) {
      const value = dataSourceOptions[key];
      if (value) {
        hash.update(key);
        hash.update(String(value));
      }
    }
    return hash.digest('hex');
  }
}
