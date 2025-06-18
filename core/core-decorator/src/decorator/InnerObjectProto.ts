import { EGG_INNER_OBJECT_PROTO_IMPL_TYPE, EggProtoImplClass, InnerObjectProtoParams } from '@eggjs/tegg-types';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { SingletonProto } from './SingletonProto';

export function InnerObjectProto(params?: InnerObjectProtoParams) {
  return function(clazz: EggProtoImplClass) {
    const protoParams = {
      protoImplType: EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
      ...params,
    };
    SingletonProto(protoParams)(clazz);
    PrototypeUtil.setIsEggInnerObject(clazz);
  };
}
