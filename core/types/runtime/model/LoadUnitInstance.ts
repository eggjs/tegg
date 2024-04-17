import { LoadUnit } from '../../metadata';
import { EggContainer } from './EggContainer';

export interface LoadUnitInstanceLifecycleContext {
  loadUnit: LoadUnit;
}

export interface LoadUnitInstance extends EggContainer<LoadUnitInstanceLifecycleContext> {
  readonly name: string;
  readonly loadUnit: LoadUnit;
}
