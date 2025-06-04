import type { EggProtoImplClass, InnerObjectProtoParams } from '@eggjs/tegg-types';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { SingletonProto } from './SingletonProto';

export function InnerObjectProto(params?: InnerObjectProtoParams) {
  return function(clazz: EggProtoImplClass) {
    SingletonProto(params)(clazz);
    PrototypeUtil.setIsEggInnerObject(clazz);
    PrototypeUtil.setObjectDecoratorLifecycleOnly(clazz);
  };
}
