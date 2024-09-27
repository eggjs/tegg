import { LoadUnitNameQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { QualifierUtil } from '../util/QualifierUtil';

export function ModuleQualifier(moduleName: string) {
  return function(target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(target as EggProtoImplClass, propertyKey, parameterIndex, LoadUnitNameQualifierAttribute, moduleName);
  };
}
