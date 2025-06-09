import { InnerObjectProtoParams } from './InnerObjectProto';

export interface CommonEggLifecycleProtoParams extends InnerObjectProtoParams {
  type: 'LoadUnit' | 'LoadUnitInstance' | 'EggObject' | 'EggPrototype' | 'EggContext' | string;
}

export type EggLifecycleProtoParams = Omit<CommonEggLifecycleProtoParams, 'type'>;
