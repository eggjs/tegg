import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { IAdvice } from '../decorator/Advice';
import { Aspect } from '../model/Aspect';

export const ASPECT_LIST = Symbol.for('EggPrototype#aspectList');

export class AspectInfoUtil {
  static setAspectList(aspectList: Array<Aspect>, clazz: EggProtoImplClass<IAdvice>) {
    MetadataUtil.defineMetaData(ASPECT_LIST, aspectList, clazz);
  }

  static getAspectList(clazz: EggProtoImplClass<IAdvice>): Array<Aspect> {
    return MetadataUtil.getMetaData(ASPECT_LIST, clazz) || [];
  }
}
