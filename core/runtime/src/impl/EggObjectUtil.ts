import { EggObject } from '../model/EggObject';
import { EggContainerFactory } from '../factory/EggContainerFactory';
import { EggPrototype } from '@eggjs/tegg-metadata';

export class EggObjectUtil {
  static eggObjectGetProperty(eggObject: EggObject): PropertyDescriptor {
    return {
      get(): any {
        return eggObject.obj;
      },
      configurable: false,
      enumerable: true,
    };
  }

  static contextEggObjectGetProperty(proto: EggPrototype, objName: PropertyKey): PropertyDescriptor {
    return {
      get(): any {
        const eggObject = EggContainerFactory.getEggObject(proto, objName);
        return eggObject.obj;
      },
      configurable: false,
      enumerable: true,
    };
  }
}
