import { DataSourceQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { QualifierUtil } from '@eggjs/core-decorator';

export function DataSourceQualifier(dataSourceName: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass,
      propertyKey, DataSourceQualifierAttribute, dataSourceName);
  };
}
