import { EggQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass, EggType } from '@eggjs/tegg-types';
import { QualifierUtil } from '../util/QualifierUtil';

export function EggQualifier(eggType: EggType) {
  return function(target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(target as EggProtoImplClass, propertyKey, parameterIndex, EggQualifierAttribute, eggType);
  };
}
