import { InitTypeQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass, ObjectInitTypeLike } from '@eggjs/tegg-types';
import { QualifierUtil } from '../util/QualifierUtil';

export function InitTypeQualifier(initType: ObjectInitTypeLike) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, InitTypeQualifierAttribute, initType);
  };
}
