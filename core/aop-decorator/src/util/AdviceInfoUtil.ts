import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { IAdvice } from '../decorator/Advice';

export const IS_ADVICE = Symbol.for('EggPrototype#isAdvice');

export class AdviceInfoUtil {
  static setIsAdvice(isAdvice: boolean, clazz: EggProtoImplClass<IAdvice>) {
    MetadataUtil.defineMetaData(IS_ADVICE, isAdvice, clazz);
  }

  static isAdvice(clazz: EggProtoImplClass<IAdvice>): boolean {
    return !!MetadataUtil.getMetaData(IS_ADVICE, clazz);
  }
}
