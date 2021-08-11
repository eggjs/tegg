import assert from 'assert';
import { ModelInfoUtil } from '../util/ModelInfoUtil';
import { EggProtoImplClass } from '@eggjs/core-decorator';

export interface AttributeOptions {
  // field name, default is property name
  name?: string;
  // allow null, default is true
  allowNull?: boolean;
  // auto increment, default is false
  autoIncrement?: boolean;
  // primary field, default is false
  primary?: boolean;
  // unique field, default is false
  unique?: boolean;
}

export function Attribute(dataType: string, options?: AttributeOptions) {
  return function(target: any, propertyKey: PropertyKey) {
    const clazz = target.constructor as EggProtoImplClass;
    assert(typeof propertyKey === 'string',
      `[model/${clazz.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    ModelInfoUtil.addModelAttribute(dataType, options, clazz, propertyKey);
  };
}
