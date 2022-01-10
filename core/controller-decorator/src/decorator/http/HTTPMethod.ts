import assert from 'assert';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import HTTPInfoUtil from '../../util/HTTPInfoUtil';
import { ControllerType, HTTPMethodEnum } from '../../model';
import MethodInfoUtil from '../../util/MethodInfoUtil';

export interface BasicHTTPMethodParams {
  method: HTTPMethodEnum;
  path?: string;
  priority?: number;
}

// We need keep HTTPMethod behavior so BasicHTTPMethod does.
function BasicHTTPMethod(param: BasicHTTPMethodParams) {
  return function(target: any, propertyKey: PropertyKey) {
    assert(typeof propertyKey === 'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`);
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.HTTP);
    HTTPInfoUtil.setHTTPMethodPath(param?.path || `/${methodName}`, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodMethod(param.method, controllerClazz, methodName);
    if (param.priority !== undefined) {
      HTTPInfoUtil.setHTTPMethodPriority(param.priority, controllerClazz, methodName);
    }
  };
}

export interface HTTPMethodParams {
  method: HTTPMethodEnum;
  path: string;
  priority?: number;
}

export function HTTPMethod(param: HTTPMethodParams) {
  return BasicHTTPMethod(param);
}

// Get has the same behavior as HTTPMethod.
// They are only different in the input parameters of the function,and path is optional.
// If path is not passed into function, the path will be automatically generated based on this function name.
export function Get(path?: string, priority?: number) {
  return BasicHTTPMethod({
    method: HTTPMethodEnum.GET,
    path,
    priority,
  });
}

// Post has the same behavior as HTTPMethod
// They are only different in the input parameters of the function,and path is optional.
// If path is not passed into function, the path will be automatically generated based on this function name.
export function Post(path?: string, priority?: number) {
  return BasicHTTPMethod({
    method: HTTPMethodEnum.POST,
    path,
    priority,
  });
}

// Put has the same behavior as HTTPMethod
// They are only different in the input parameters of the function,and path is optional.
// If path is not passed into function, the path will be automatically generated based on this function name.
export function Put(path?: string, priority?: number) {
  return BasicHTTPMethod({
    method: HTTPMethodEnum.PUT,
    path,
    priority,
  });
}

// Delete have the same behavior as HTTPMethod
// They are only different in the input parameters of the function,and path is optional.
// If path is not passed into function, the path will be automatically generated based on this function name.
export function Delete(path?: string, priority?: number) {
  return BasicHTTPMethod({
    method: HTTPMethodEnum.DELETE,
    path,
    priority,
  });
}

// Patch have the same behavior as HTTPMethod
// They are only different in the input parameters of the function,and path is optional.
// If path is not passed into function, the path will be automatically generated based on this function name.
export function Patch(path?: string, priority?: number) {
  return BasicHTTPMethod({
    method: HTTPMethodEnum.PATCH,
    path,
    priority,
  });
}

// Options have the same behavior as HTTPMethod
// They are only different in the input parameters of the function,and path is optional.
// If path is not passed into function, the path will be automatically generated based on this function name.
export function Options(path?: string, priority?: number) {
  return BasicHTTPMethod({
    method: HTTPMethodEnum.OPTIONS,
    path,
    priority,
  });
}

// Head have the same behavior as HTTPMethod
// They are only different in the input parameters of the function,and path is optional.
// If path is not passed into function, the path will be automatically generated based on this function name.
export function Head(path?: string, priority?: number) {
  return BasicHTTPMethod({
    method: HTTPMethodEnum.HEAD,
    path,
    priority,
  });
}
