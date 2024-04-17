import { EggQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass, EggType } from '@eggjs/tegg-types';
import { QualifierUtil } from '../util/QualifierUtil';

export function EggQualifier(eggType: EggType) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, EggQualifierAttribute, eggType);
  };
}
