import { QualifierUtil } from '../util/QualifierUtil';
import { ConfigSourceQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

export function ConfigSourceQualifier(moduleName: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, ConfigSourceQualifierAttribute, moduleName);
  };
}
