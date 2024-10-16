import assert from 'node:assert';
import {
  AccessLevel, Inject, LoadUnitNameQualifierAttribute,
  MultiInstanceInfo,
  MultiInstanceProto,
  MultiInstancePrototypeGetObjectsContext,
  ObjectInfo,
  ObjectInitType,
} from '@eggjs/tegg';
import {
  EggLoadUnitType,
  LoaderFactory,
  ModuleConfigUtil,
} from '@eggjs/tegg/helper';
import {
  DataSourceInjectName,
  DataSourceQualifierAttribute,
  TableInfoUtil,
  TableModel,
} from '@eggjs/tegg/dal';
import { DataSource } from '@eggjs/dal-runtime';
import { TableModelManager } from './TableModelManager';
import { MysqlDataSourceManager } from './MysqlDataSourceManager';
import { SqlMapManager } from './SqlMapManager';
import { TransactionalAOP } from './TransactionalAOP';

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
export class DataSourceDelegate<T> extends DataSource<T> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private transactionalAOP: TransactionalAOP;
  objInfo: ObjectInfo;

  constructor(
    @Inject({ name: 'transactionalAOP' }) transactionalAOP: TransactionalAOP,
    @MultiInstanceInfo([ DataSourceQualifierAttribute, LoadUnitNameQualifierAttribute ]) objInfo: ObjectInfo) {
    const dataSourceQualifierValue = objInfo.qualifiers.find(t => t.attribute === DataSourceQualifierAttribute)?.value;
    assert(dataSourceQualifierValue);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ moduleName, dataSource, clazzName ] = (dataSourceQualifierValue as string).split('.');
    const tableModel = TableModelManager.instance.get(moduleName, clazzName);
    assert(tableModel, `not found table ${dataSourceQualifierValue}`);
    const mysqlDataSource = MysqlDataSourceManager.instance.get(moduleName, dataSource);
    assert(mysqlDataSource, `not found dataSource ${dataSource} in module ${moduleName}`);
    const sqlMap = SqlMapManager.instance.get(moduleName, clazzName);
    assert(sqlMap, `not found SqlMap ${clazzName} in module ${moduleName}`);

    super(tableModel as TableModel<T>, mysqlDataSource, sqlMap);
    this.transactionalAOP = transactionalAOP;
    this.objInfo = objInfo;
  }
}
