import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import MethodInfoUtil from '../../util/MethodInfoUtil';
import assert from 'assert';
import { HostType } from '../../model';

export function Host(host: HostType) {

  function parseHost(): string[] {
    return Array.isArray(host) ? host : [ host ];
  }

  function classHost(constructor: EggProtoImplClass) {
    ControllerInfoUtil.addControllerHosts(parseHost(), constructor);
  }

  function methodHost(target: any, propertyKey: PropertyKey) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodHosts(parseHost(), controllerClazz, methodName);
  }

  return function(target: any, propertyKey?: PropertyKey) {
    if (propertyKey === undefined) {
      classHost(target);
    } else {
      methodHost(target, propertyKey);
    }
  };
}
