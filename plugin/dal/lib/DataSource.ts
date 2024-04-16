import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import {
  AccessLevel,
  MultiInstanceProto,
  MultiInstancePrototypeGetObjectsContext,
  ObjectInfo,
  ObjectInitType,
  LifecycleInit,
} from '@eggjs/tegg';
import { ModuleConfigUtil, LoaderUtil, EggObject, EggObjectLifeCycleContext } from '@eggjs/tegg/helper';
import {
  DataSourceInjectName,
  DataSourceQualifierAttribute,
  TableInfoUtil,
  DataSource as IDataSource, TableModel, PaginateData,
} from '@eggjs/tegg/dal';
import { DataSource } from '@eggjs/dal-runtime';
import { TableModelManager } from './TableModelManager';
import { MysqlDataSourceManager } from './MysqlDataSourceManager';
import { SqlMapManager } from './SqlMapManager';

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath) as any | undefined;
    const dataSources = Object.keys(config?.dataSource || {});
    const result: ObjectInfo[] = [];
    const daoDir = path.join(ctx.unitPath, 'dal/dao');
    let dirents: string[];
    try {
      dirents = fs.readdirSync(daoDir);
    } catch {
      return [];
    }
    const daos = dirents.filter(t => t.endsWith(`DAO${LoaderUtil.extension}`));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const daoClazzList = daos.map(t => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(path.join(daoDir, t)).default;
    });
    const tableClazzList = daoClazzList.map(t => {
      // eslint-disable-next-line no-proto
      return Object.getPrototypeOf(t).clazzModel;
    });
    const dataSourceLength = dataSources.length;

    for (const dataSource of dataSources) {
      const moduleClazzList = tableClazzList.filter(clazz => {
        const tableParams = TableInfoUtil.getTableParams(clazz);
        const dataSourceName = tableParams?.dataSourceName ?? 'default';
        return dataSourceLength === 1 || dataSourceName === dataSource;
      });
      for (const clazz of moduleClazzList) {
        result.push({
          name: DataSourceInjectName,
          qualifiers: [{
            attribute: DataSourceQualifierAttribute,
            value: `${ctx.moduleName}.${dataSource}.${clazz.name}`,
          }],
        });
      }
    }
    return result;
  },
})
export class DataSourceDelegate<T> implements IDataSource<T> {
  private dataSource: DataSource<T>;

  @LifecycleInit()
  async init(_: EggObjectLifeCycleContext, obj: EggObject) {
    const dataSourceQualifierValue = obj.proto.getQualifier(DataSourceQualifierAttribute);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ moduleName, dataSource, clazzName ] = (dataSourceQualifierValue as string).split('.');
    const tableModel = TableModelManager.instance.get(moduleName, clazzName);
    assert(tableModel, `not found table ${dataSourceQualifierValue}`);
    const mysqlDataSource = MysqlDataSourceManager.instance.get(moduleName, dataSource);
    assert(mysqlDataSource, `not found dataSource ${dataSource} in module ${moduleName}`);
    const sqlMap = SqlMapManager.instance.get(moduleName, clazzName);
    assert(sqlMap, `not found SqlMap ${clazzName} in module ${moduleName}`);

    this.dataSource = new DataSource<T>(tableModel as TableModel<T>, mysqlDataSource, sqlMap);
  }

  async execute(sqlName: string, data?: any): Promise<T[]> {
    return this.dataSource.execute(sqlName, data);
  }

  async executeScalar(sqlName: string, data?: any): Promise<T | null> {
    return this.dataSource.executeScalar(sqlName, data);
  }

  async executeRaw(sqlName: string, data?: any): Promise<any[]> {
    return this.dataSource.executeRaw(sqlName, data);
  }

  async executeRawScalar(sqlName: string, data?: any): Promise<any> {
    return this.dataSource.executeRawScalar(sqlName, data);
  }

  async paginate(sqlName: string, data: any, currentPage: number, perPageCount: number): Promise<PaginateData<T>> {
    return this.dataSource.paginate(sqlName, data, currentPage, perPageCount);
  }

  async count(sqlName: string, data?: any): Promise<number> {
    return this.dataSource.count(sqlName, data);
  }
}
