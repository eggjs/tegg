import { QualifierUtil } from '../util/QualifierUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';
import { ObjectInitTypeLike } from '../enum/ObjectInitType';

export const InitTypeQualifierAttribute = Symbol.for('Qualifier.InitType');

export function InitTypeQualifier(initType: ObjectInitTypeLike) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, InitTypeQualifierAttribute, initType);
  };
}
