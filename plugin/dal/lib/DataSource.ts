import assert from 'node:assert';
import {
  AccessLevel,
  LifecycleInit,
  MultiInstanceProto,
  MultiInstancePrototypeGetObjectsContext,
  ObjectInfo,
  ObjectInitType,
} from '@eggjs/tegg';
import {
  EggLoadUnitType,
  EggObject,
  EggObjectLifeCycleContext,
  LoaderFactory,
  ModuleConfigUtil,
} from '@eggjs/tegg/helper';
import {
  DataSource as IDataSource,
  DataSourceInjectName,
  DataSourceQualifierAttribute,
  PaginateData,
  TableInfoUtil,
  TableModel,
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
    const loader = LoaderFactory.createLoader(ctx.unitPath, EggLoadUnitType.MODULE);
    const clazzList = loader.load();
    const tableClazzList = clazzList.filter(t => {
      return TableInfoUtil.getIsTable(t);
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
