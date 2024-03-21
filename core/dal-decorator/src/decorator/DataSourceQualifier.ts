import { QualifierUtil, EggProtoImplClass } from '@eggjs/tegg';

export const DataSourceQualifierAttribute = Symbol('Qualifier.DataSource');
export const DataSourceInjectName = 'dataSource';

export function DataSourceQualifier(dataSourceName: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass,
      propertyKey, DataSourceQualifierAttribute, dataSourceName);
  };
}
