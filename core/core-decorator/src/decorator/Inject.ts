import { InjectObjectInfo } from '../model/InjectObjectInfo';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';

export interface InjectParams {
  // obj instance name, default is property name
  name?: string;
}

export function Inject(param?: InjectParams | string) {
  return function(target: any, propertyKey: PropertyKey) {
    // params allow string, or object
    const objName = typeof param === 'string' ? param : param?.name;
    const injectObject: InjectObjectInfo = {
      refName: propertyKey,
      objName: objName || propertyKey,
    };

    PrototypeUtil.addInjectObject(target.constructor as EggProtoImplClass, injectObject);
  };
}
