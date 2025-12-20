import type { EggAbstractClazz, EggProtoImplClass } from '@eggjs/tegg-types';
import { FactoryQualifierUtil } from './FactoryQualifierUtil';

export function FactoryQualifier(dynamics: EggAbstractClazz | EggAbstractClazz[]) {
  return function(target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    FactoryQualifierUtil.addProperQualifier(target as EggProtoImplClass, propertyKey, parameterIndex, dynamics);
  };
}
