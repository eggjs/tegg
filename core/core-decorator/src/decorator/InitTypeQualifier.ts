import { InitTypeQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass, ObjectInitTypeLike } from '@eggjs/tegg-types';
import { QualifierUtil } from '../util/index.js';

export function InitTypeQualifier(initType: ObjectInitTypeLike) {
  return function(target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(target as EggProtoImplClass, propertyKey, parameterIndex, InitTypeQualifierAttribute, initType);
  };
}
