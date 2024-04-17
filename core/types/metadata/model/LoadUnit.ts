import { EggPrototypeName, QualifierInfo } from '../../core-decorator';
import { LifecycleContext, LifecycleObject } from '../../lifecycle';
import { EggPrototype } from './EggPrototype';
import { Loader } from './Loader';

export enum EggLoadUnitType {
  MODULE = 'MODULE',
  PLUGIN = 'PLUGIN',
  APP = 'APP',
}

export type EggLoadUnitTypeLike = EggLoadUnitType | string;

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

export interface LoadUnitPair {
  loadUnit: LoadUnit;
  ctx: LoadUnitLifecycleContext;
}

export type LoadUnitCreator = (ctx: LoadUnitLifecycleContext) => LoadUnit;
