import type { EggProtoImplClass, IAdvice, PointcutOptions } from '@eggjs/tegg-types';
import { PointcutAdviceInfoUtil } from '../util/PointcutAdviceInfoUtil';
import assert from 'assert';
import { AdviceInfoUtil } from '../util/AdviceInfoUtil';

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
