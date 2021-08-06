import assert from 'assert';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import HTTPInfoUtil from '../../util/HTTPInfoUtil';
import { ControllerType, HTTPMethodEnum } from '../../model';
import MethodInfoUtil from '../../util/MethodInfoUtil';

export interface HTTPMethodParams {
  method: HTTPMethodEnum;
  path: string;
  priority?: number;
}

export function HTTPMethod(param: HTTPMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.HTTP);
    HTTPInfoUtil.setHTTPMethodPath(param.path, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodMethod(param.method, controllerClazz, methodName);
    if (param.priority !== undefined) {
      HTTPInfoUtil.setHTTPMethodPriority(param.priority, controllerClazz, methodName);
    }
  };
}
