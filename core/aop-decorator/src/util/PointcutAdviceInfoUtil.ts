import {
  EggProtoImplClass, MetadataUtil,
} from '@eggjs/core-decorator';
import { AdviceInfo } from '../model/Aspect';

export const POINTCUT_ADVICE_INFO_LIAR = Symbol.for('EggPrototype#pointcutAdviceInfoList');

interface PointcutAdviceInfo {
  method: PropertyKey;
  adviceInfo: AdviceInfo;
}

export class PointcutAdviceInfoUtil {
  static addPointcutAdviceInfo(adviceInfo: AdviceInfo, clazz: EggProtoImplClass, method: PropertyKey) {
    const pointcutAdviceInfoList = MetadataUtil.initOwnArrayMetaData<PointcutAdviceInfo>(POINTCUT_ADVICE_INFO_LIAR, clazz, []);
    // FIXME: parent/child should has correct order
    pointcutAdviceInfoList.unshift({
      method,
      adviceInfo,
    });
  }

  static getPointcutAdviceInfoList(clazz: EggProtoImplClass, method: PropertyKey): Array<AdviceInfo> {
    const pointcutAdviceInfoList: Array<PointcutAdviceInfo> | undefined = MetadataUtil.getMetaData(POINTCUT_ADVICE_INFO_LIAR, clazz) || [];
    return pointcutAdviceInfoList.filter(t => t.method === method).map(t => t.adviceInfo);
  }
}
