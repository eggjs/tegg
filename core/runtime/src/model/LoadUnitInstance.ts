import { EggContainer } from './EggContainer';
import { LoadUnit } from '@eggjs/tegg-metadata';
import { LifecycleUtil } from '@eggjs/tegg-lifecycle';


export interface LoadUnitInstanceLifecycleContext {
  loadUnit: LoadUnit;
}

export interface LoadUnitInstance extends EggContainer<LoadUnitInstanceLifecycleContext> {
  readonly name: string;
  readonly loadUnit: LoadUnit;
}

export const LoadUnitInstanceLifecycleUtil = new LifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance>();
