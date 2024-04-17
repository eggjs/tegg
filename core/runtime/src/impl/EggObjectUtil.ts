import type { EggObject, EggPrototype } from '@eggjs/tegg-types';
import { EggContainerFactory } from '../factory/EggContainerFactory';

export class EggObjectUtil {
  static eggObjectGetProperty(eggObject: EggObject): PropertyDescriptor {
    return {
      get(): any {
        return eggObject.obj;
      },
      configurable: true,
      enumerable: true,
    };
  }

  static contextEggObjectGetProperty(proto: EggPrototype, objName: PropertyKey): PropertyDescriptor {
    const PROTO_OBJ_GETTER = Symbol(`EggPrototype#objGetter#${String(objName)}`);
    if (!proto[PROTO_OBJ_GETTER]) {
      proto[PROTO_OBJ_GETTER] = {
        get(): any {
          const eggObject = EggContainerFactory.getEggObject(proto, objName);
          return eggObject.obj;
        },
        configurable: true,
        enumerable: true,
      };
    }
    return proto[PROTO_OBJ_GETTER];
  }
}
