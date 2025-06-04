import { InnerObjectProtoParams } from './InnerObjectProto';

export interface CommonEggLifecycleProtoParams extends InnerObjectProtoParams {
  type: 'LoadUnit' | 'EggObject' | 'EggPrototype' | string;
}

export type EggLifecycleProtoParams = Omit<CommonEggLifecycleProtoParams, 'type'>;
