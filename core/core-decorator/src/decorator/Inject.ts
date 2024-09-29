import { EggProtoImplClass, InjectObjectInfo, InjectConstructorInfo, InjectParams, InjectType } from '@eggjs/tegg-types';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { ObjectUtils } from '@eggjs/tegg-common-util';

export function Inject(param?: InjectParams | string) {
  function propertyInject(target: any, propertyKey: PropertyKey) {
    let objName: PropertyKey | undefined;
    if (!param) {
      // try to read design:type from proto
      const proto = PrototypeUtil.getDesignType(target, propertyKey);
      if (typeof proto === 'function' && proto !== Object) {
        // if property type is function and not Object( means maybe proto class ), then try to read EggPrototypeInfo.name as obj name
        const info = PrototypeUtil.getProperty(proto as EggProtoImplClass);
        objName = info?.name;
      }
    } else {
      // params allow string or object
      objName = typeof param === 'string' ? param : param?.name;
    }

    const injectObject: InjectObjectInfo = {
      refName: propertyKey,
      objName: objName || propertyKey,
    };

    PrototypeUtil.setInjectType(target.constructor, InjectType.PROPERTY);
    PrototypeUtil.addInjectObject(target.constructor as EggProtoImplClass, injectObject);
  }

  function constructorInject(target: any, parameterIndex: number) {
    const argNames = ObjectUtils.getConstructorArgNameList(target);
    const argName = argNames[parameterIndex];
    // TODO get objName from design:type
    const objName = typeof param === 'string' ? param : param?.name;
    const injectObject: InjectConstructorInfo = {
      refIndex: parameterIndex,
      refName: argName,
      objName: objName || argName,
    };

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
