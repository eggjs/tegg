import { InjectObjectInfo } from '../model/InjectObjectInfo';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';

export interface InjectParams {
  // obj instance name, default is property name
  name?: string;
}

export function Inject(param?: InjectParams | string) {
  return function(target: any, propertyKey: PropertyKey) {
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

    PrototypeUtil.addInjectObject(target.constructor as EggProtoImplClass, injectObject);
  };
}
