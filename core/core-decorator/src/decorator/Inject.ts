import {
  EggProtoImplClass,
  InjectObjectInfo,
  InjectConstructorInfo,
  InjectParams,
  InjectType,
  InitTypeQualifierAttribute,
} from '@eggjs/tegg-types';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { QualifierUtil } from '../util/QualifierUtil';

function guessInjectInfo(clazz: EggProtoImplClass, name: PropertyKey, proto: any) {
  let objName: PropertyKey | undefined;
  let initType: string | undefined;

  if (typeof proto === 'function' && proto !== Object) {
    // if property type is function and not Object( means maybe proto class ), then try to read EggPrototypeInfo.name as obj name
    const info = PrototypeUtil.getProperty(proto as EggProtoImplClass);
    objName = info?.name;
    // try to read EggPrototypeInfo.initType as qualifier
    if (info?.initType) {
      const customInitType = QualifierUtil.getProperQualifier(clazz, name, InitTypeQualifierAttribute);
      if (!customInitType) {
        initType = info.initType;
      }
    }
  }

  return {
    objName,
    initType,
  };
}

export function Inject(param?: InjectParams | string) {
  const injectParam = typeof param === 'string' ? { name: param } : param;

  function propertyInject(target: any, propertyKey: PropertyKey) {
    let objName: PropertyKey | undefined;
    let initType: string | undefined;
    if (!injectParam) {
      // try to read design:type from proto
      const proto = PrototypeUtil.getDesignType(target, propertyKey);
      ({ objName, initType } = guessInjectInfo(target.constructor, propertyKey, proto));
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

    if (initType) {
      QualifierUtil.addProperQualifier(target.constructor, propertyKey, InitTypeQualifierAttribute, initType);
    }
  }

  function constructorInject(target: any, parameterIndex: number) {
    const argNames = ObjectUtils.getConstructorArgNameList(target);
    const argName = argNames[parameterIndex];

    let objName: PropertyKey | undefined;
    let initType: string | undefined;

    if (!injectParam) {
      // try to read proto from design:paramtypes
      const protos = PrototypeUtil.getDesignParamtypes(target);
      ({ objName, initType } = guessInjectInfo(target, argName, protos?.[parameterIndex]));
    } else {
      // params allow string or object
      objName = injectParam?.name;
    }

    const injectObject: InjectConstructorInfo = {
      refIndex: parameterIndex,
      refName: argName,
      objName: objName || argName,
    };

    if (injectParam?.optional) {
      injectObject.optional = true;
    }

    PrototypeUtil.setInjectType(target, InjectType.CONSTRUCTOR);
    PrototypeUtil.addInjectConstructor(target as EggProtoImplClass, injectObject);

    if (initType) {
      QualifierUtil.addProperQualifier(target, argName, InitTypeQualifierAttribute, initType);
    }
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
