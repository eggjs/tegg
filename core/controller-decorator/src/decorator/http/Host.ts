import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import MethodInfoUtil from '../../util/MethodInfoUtil';
import assert from 'assert';

export function Host(host: string) {
  function classHost(constructor: EggProtoImplClass) {
    ControllerInfoUtil.addControllerHost(host, constructor);
  }

  function methodHOst(target: any, propertyKey: PropertyKey) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;

    MethodInfoUtil.setMethodHost(host, controllerClazz, methodName);
  }

  return function(target: any, propertyKey?: PropertyKey) {
    if (propertyKey === undefined) {
      classHost(target);
    } else {
      methodHOst(target, propertyKey);
    }
  };
}
