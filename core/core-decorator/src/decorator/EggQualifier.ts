import { QualifierUtil } from '../util/QualifierUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';
import { EggType } from '../enum/EggType';

export const EggQualifierAttribute = Symbol.for('Qualifier.Egg');

export function EggQualifier(eggType: EggType) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, EggQualifierAttribute, eggType);
  };
}
