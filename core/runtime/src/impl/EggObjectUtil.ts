import { EggObject } from '../model/EggObject';

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
}
