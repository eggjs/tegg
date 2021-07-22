import assert from 'assert';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import ControllerInfoUtil from '../util/ControllerInfoUtil';
import MethodInfoUtil from '../util/MethodInfoUtil';

export function Acl(code?: string) {
  function classAcl(constructor: EggProtoImplClass) {
    ControllerInfoUtil.setControllerAcl(code, constructor);
  }

  function methodAcl(target: any, propertyKey: PropertyKey) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodAcl(code, controllerClazz, methodName);
  }

  return function(target: any, propertyKey?: PropertyKey) {
    if (propertyKey === undefined) {
      classAcl(target);
    } else {
      methodAcl(target, propertyKey);
    }
  };
}
