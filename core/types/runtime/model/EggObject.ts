import { EggPrototypeName } from '../../core-decorator/index.js';
import { LifecycleContext, LifecycleObject } from '../../lifecycle/index.js';
import { EggPrototype, LoadUnit } from '../../metadata/index.js';
import type { EggRuntimeContext } from './EggContext.js';
import type { LoadUnitInstance } from './LoadUnitInstance.js';

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
  readonly obj: Record<string | symbol, any>;
  readonly proto: EggPrototype;
  readonly name: EggPrototypeName;
  readonly ctx?: EggRuntimeContext;

  injectProperty(name: string, descriptor: PropertyDescriptor): void;
}
