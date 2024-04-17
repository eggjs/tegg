import { LoadUnitNameQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { QualifierUtil } from '../util/QualifierUtil';

export function ModuleQualifier(moduleName: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, LoadUnitNameQualifierAttribute, moduleName);
  };
}
