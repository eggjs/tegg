import { LoadUnit } from '../../metadata/model/LoadUnit.js';
import { EggContainer } from './EggContainer.js';

export interface LoadUnitInstanceLifecycleContext {
  loadUnit: LoadUnit;
}

export interface LoadUnitInstance extends EggContainer<LoadUnitInstanceLifecycleContext> {
  readonly name: string;
  readonly loadUnit: LoadUnit;
}
