import { IAdvice } from './Advice';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import { PointcutAdviceInfoUtil } from '../util/PointcutAdviceInfoUtil';
import assert from 'assert';
import { AdviceInfoUtil } from '../util/AdviceInfoUtil';

export interface PointcutOptions<K = any> {
  // default is 1000
  order?: number;
  adviceParams?: K;
}

const defaultPointcutOptions = {
  order: 1000,
};

export function Pointcut<T extends object, K = any>(adviceClazz: EggProtoImplClass<IAdvice<T, K>>, options?: PointcutOptions<K>) {
  return function(target: any, propertyKey: PropertyKey) {
    assert(AdviceInfoUtil.isAdvice(adviceClazz), `class ${adviceClazz} has no @Advice decorator`);
    const targetClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    PointcutAdviceInfoUtil.addPointcutAdviceInfo({
      clazz: adviceClazz,
      order: options?.order ?? defaultPointcutOptions.order,
      adviceParams: options?.adviceParams,
    }, targetClazz, methodName);
  };
}
