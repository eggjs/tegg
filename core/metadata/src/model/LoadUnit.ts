import { LifecycleContext, LifecycleObject, LifecycleUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototypeName, QualifierInfo } from '@eggjs/core-decorator';

import { EggLoadUnitTypeLike } from '../enum/EggLoadUnitType';
import { EggPrototype } from './EggPrototype';
import { Loader } from './Loader';

export interface LoadUnitLifecycleContext extends LifecycleContext {
  unitPath: string;
  loader: Loader;
}

export interface LoadUnit extends LifecycleObject<LoadUnitLifecycleContext> {
  readonly name: string;
  readonly unitPath: string;
  readonly type: EggLoadUnitTypeLike;

  iterateEggPrototype(): IterableIterator<EggPrototype>;
  registerEggPrototype(proto: EggPrototype): void;
  deletePrototype(proto: EggPrototype);
  getEggPrototype(name: EggPrototypeName, qualifiers: QualifierInfo[]): EggPrototype[];
  containPrototype(proto: EggPrototype): boolean;
}

export const LoadUnitLifecycleUtil = new LifecycleUtil<LoadUnitLifecycleContext, LoadUnit>();
