import { LifecycleContext, LifecycleObject, LifecycleUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototype, LoadUnit } from '@eggjs/tegg-metadata';
import { EggPrototypeName } from '@eggjs/core-decorator';
import { EggContext } from './EggContext';
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
  readonly ctx?: EggContext;

  injectProperty(name: string, descriptor: PropertyDescriptor);
}

export const EggObjectLifecycleUtil = new LifecycleUtil<EggObjectLifeCycleContext, EggObject>();
