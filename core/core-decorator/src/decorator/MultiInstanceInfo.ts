import { PrototypeUtil } from '../util/PrototypeUtil';
import { QualifierAttribute } from '@eggjs/tegg-types';

export function MultiInstanceInfo(attributes: QualifierAttribute[]) {
  return function(target: any, _propertyKey: PropertyKey | undefined, parameterIndex: number) {
    PrototypeUtil.setMultiInstanceConstructorIndex(target, parameterIndex);
    PrototypeUtil.setMultiInstanceConstructorAttributes(target, attributes);
  };
}
