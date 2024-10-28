import { EggProtoImplClass, InjectObjectInfo, InjectConstructorInfo, InjectParams, InjectType } from '@eggjs/tegg-types';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { ObjectUtils } from '@eggjs/tegg-common-util';

export function Inject(param?: InjectParams | string) {
  const injectParam = typeof param === 'string' ? { name: param } : param;

  function propertyInject(target: any, propertyKey: PropertyKey) {
    let objName: PropertyKey | undefined;
    if (!injectParam) {
      // try to read design:type from proto
      const proto = PrototypeUtil.getDesignType(target, propertyKey);
      if (typeof proto === 'function' && proto !== Object) {
        // if property type is function and not Object( means maybe proto class ), then try to read EggPrototypeInfo.name as obj name
        const info = PrototypeUtil.getProperty(proto as EggProtoImplClass);
        objName = info?.name;
      }
    } else {
      // params allow string or object
      objName = injectParam?.name;
    }

    const injectObject: InjectObjectInfo = {
      refName: propertyKey,
      objName: objName || propertyKey,
    };

    if (injectParam?.optional) {
      injectObject.optional = true;
    }

    PrototypeUtil.setInjectType(target.constructor, InjectType.PROPERTY);
    PrototypeUtil.addInjectObject(target.constructor as EggProtoImplClass, injectObject);
  }

  function constructorInject(target: any, parameterIndex: number) {
    const argNames = ObjectUtils.getConstructorArgNameList(target);
    const argName = argNames[parameterIndex];
    const injectObject: InjectConstructorInfo = {
      refIndex: parameterIndex,
      refName: argName,
      // TODO get objName from design:type
      objName: injectParam?.name || argName,
    };

    if (injectParam?.optional) {
      injectObject.optional = true;
    }

    PrototypeUtil.setInjectType(target, InjectType.CONSTRUCTOR);
    PrototypeUtil.addInjectConstructor(target as EggProtoImplClass, injectObject);
  }

  return function(target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    if (typeof parameterIndex === 'undefined') {
      propertyInject(target, propertyKey!);
    } else {
      constructorInject(target, parameterIndex!);
    }
  };
}

export function InjectOptional(param?: Omit<InjectParams, 'optional'> | string) {
  const injectParam = typeof param === 'string' ? { name: param } : param;

  return Inject({
    ...injectParam,
    optional: true,
  });
}
