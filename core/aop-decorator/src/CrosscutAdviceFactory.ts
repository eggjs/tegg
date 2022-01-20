import assert from 'assert';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import { IAdvice } from './decorator/Advice';
import { CrosscutInfoUtil } from './util/CrosscutInfoUtil';
import { AdviceInfo } from './model/Aspect';

export class CrosscutAdviceFactory {
  private readonly crosscutAdviceClazzList: Array<EggProtoImplClass<IAdvice>> = [];

  registerCrossAdviceClazz(clazz: EggProtoImplClass<IAdvice>) {
    assert(CrosscutInfoUtil.isCrosscutAdvice(clazz), `clazz ${clazz.name} is not crosscut advice`);
    this.crosscutAdviceClazzList.push(clazz);
  }

  getAdvice(clazz: EggProtoImplClass, method: PropertyKey): Array<AdviceInfo> {
    const result: Array<AdviceInfo> = [];
    for (const crosscutAdviceClazz of this.crosscutAdviceClazzList) {
      const crosscutInfoList = CrosscutInfoUtil.getCrosscutInfoList(crosscutAdviceClazz);
      for (const crosscutInfo of crosscutInfoList) {
        if (crosscutInfo.pointcutInfo.match(clazz, method)) {
          result.push(crosscutInfo.adviceInfo);
        }
      }
    }
    return result;
  }
}
