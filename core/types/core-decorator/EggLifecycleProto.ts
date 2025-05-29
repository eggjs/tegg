import { SingletonProtoParams } from './SingletonProto';

export interface CommonEggLifecycleProtoParams extends SingletonProtoParams {
  type: 'LoadUnit' | 'EggObject' | 'EggPrototype' | string;
}

export type EggLifecycleProtoParams = Omit<CommonEggLifecycleProtoParams, 'type'>;
