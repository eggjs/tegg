import { AdviceInfo } from '../model/Aspect';
import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { IAdvice } from '../decorator/Advice';
import { PointcutInfo } from '../model/PointcutInfo';

export const CROSSCUT_INFO_LIST = Symbol.for('EggPrototype#crosscutInfoList');
export const IS_CROSSCUT_ADVICE = Symbol.for('EggPrototype#isCrosscutAdvice');

export interface CrosscutInfo {
  pointcutInfo: PointcutInfo;
  adviceInfo: AdviceInfo;
}

export class CrosscutInfoUtil {
  static setIsCrosscutAdvice(isCrosscutAdvice: boolean, clazz: EggProtoImplClass<IAdvice>) {
    MetadataUtil.defineMetaData(IS_CROSSCUT_ADVICE, isCrosscutAdvice, clazz);
  }

  static isCrosscutAdvice(clazz: EggProtoImplClass<IAdvice>): boolean {
    return !!MetadataUtil.getMetaData(IS_CROSSCUT_ADVICE, clazz);
  }

  static addCrosscutInfo(crosscutInfo: CrosscutInfo, clazz: EggProtoImplClass<IAdvice>) {
    const crosscutInfoList = MetadataUtil.initOwnArrayMetaData<CrosscutInfo>(CROSSCUT_INFO_LIST, clazz, []);
    crosscutInfoList.push(crosscutInfo);
  }

  static getCrosscutInfoList(clazz: EggProtoImplClass<IAdvice>): Array<CrosscutInfo> {
    return MetadataUtil.getArrayMetaData(CROSSCUT_INFO_LIST, clazz) || [];
  }
}
