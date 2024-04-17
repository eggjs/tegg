import { EggPrototypeName } from '../../core-decorator';
import { LifecycleContext, LifecycleObject } from '../../lifecycle';
import { EggPrototype, LoadUnit } from '../../metadata';
import { EggRuntimeContext } from './EggContext';
import { LoadUnitInstance } from './LoadUnitInstance';

export enum EggObjectStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  ERROR = 'ERROR',
  DESTROYING = 'DESTROYING',
  DESTROYED = 'DESTROYED',
}

export interface EggObjectLifeCycleContext extends LifecycleContext {
  readonly loadUnit: LoadUnit;
  readonly loadUnitInstance: LoadUnitInstance;
}

export interface EggObject extends LifecycleObject<EggObjectLifeCycleContext> {
  readonly isReady: boolean;
  readonly obj: object;
  readonly proto: EggPrototype;
  readonly name: EggPrototypeName;
  readonly ctx?: EggRuntimeContext;

  injectProperty(name: string, descriptor: PropertyDescriptor);
}
