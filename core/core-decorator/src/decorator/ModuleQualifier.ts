import { QualifierUtil } from '../util/QualifierUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';

export const LoadUnitNameQualifierAttribute = Symbol.for('Qualifier.LoadUnitName');

export function ModuleQualifier(moduleName: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, LoadUnitNameQualifierAttribute, moduleName);
  };
}
