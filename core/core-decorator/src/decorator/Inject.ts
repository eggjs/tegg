import { InjectObjectInfo } from '../model/InjectObjectInfo';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';

export interface InjectParams {
  // obj instance name, default is property name
  name?: string;
}

export function Inject(param?: InjectParams | EggProtoImplClass | string) {
  return function(target: any, propertyKey: PropertyKey) {
    // params allow string, protoClass, or object
    let objName: PropertyKey | undefined;
    if (typeof param === 'string') {
      objName = param;
    } else if (param) {
      const protoInfo = PrototypeUtil.getProperty(param as EggProtoImplClass);
      objName = protoInfo ? protoInfo.name : param.name;
    }

    const injectObject: InjectObjectInfo = {
      refName: propertyKey,
      objName: objName || propertyKey,
    };

    PrototypeUtil.addInjectObject(target.constructor as EggProtoImplClass, injectObject);
  };
}
