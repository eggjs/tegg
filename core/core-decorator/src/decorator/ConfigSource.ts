import { QualifierUtil } from '../util/QualifierUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';

export const ConfigSourceQualifierAttribute = Symbol.for('Qualifier.ConfigSource');

export function ConfigSourceQualifier(moduleName: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, ConfigSourceQualifierAttribute, moduleName);
  };
}
