import assert from 'node:assert';
import type { CommonEggLifecycleProtoParams, EggLifecycleProtoParams, EggProtoImplClass } from '@eggjs/tegg-types';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { InnerObjectProto } from './InnerObjectProto';

export function EggLifecycleProto(params: CommonEggLifecycleProtoParams) {
  return function(clazz: EggProtoImplClass) {
    const { type, ...protoParams } = params || {};
    assert(type, 'EggLifecycle decorator should have type property');

    InnerObjectProto(protoParams)(clazz);

    PrototypeUtil.setIsEggLifecyclePrototype(clazz);
    PrototypeUtil.setEggLifecyclePrototypeMetadata(clazz, { type });
  };
}

const createLifecycleProto = (type: CommonEggLifecycleProtoParams['type']) => {
  return (params?: EggLifecycleProtoParams) => EggLifecycleProto({ type, ...params });
};

export const LoadUnitLifecycleProto = createLifecycleProto('LoadUnit');
export const EggObjectLifecycleProto = createLifecycleProto('EggObject');
export const EggPrototypeLifecycleProto = createLifecycleProto('EggPrototype');
