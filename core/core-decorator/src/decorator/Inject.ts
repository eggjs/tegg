import { InjectObjectInfo } from '../model/InjectObjectInfo';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';

export interface InjectParams {
  // obj instance name, default is property name
  name?: string;
}

export function Inject(param?: InjectParams) {
  return function(target: any, propertyKey: PropertyKey) {
    const objName = param?.name || propertyKey;
    const injectObject: InjectObjectInfo = {
      refName: propertyKey,
      objName,
    };
    PrototypeUtil.addInjectObject(target.constructor as EggProtoImplClass, injectObject);
  };
}
