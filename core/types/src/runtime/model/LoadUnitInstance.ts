import type { LoadUnit } from '../../metadata/index.js';
import type { EggContainer } from './EggContainer.js';

export interface LoadUnitInstanceLifecycleContext {
  loadUnit: LoadUnit;
}

export interface LoadUnitInstance extends EggContainer<LoadUnitInstanceLifecycleContext> {
  readonly name: string;
  readonly loadUnit: LoadUnit;
}
