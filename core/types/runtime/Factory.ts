import type { EggObjectName } from '../core-decorator';
import type { LifecycleContext } from '../lifecycle';
import type { EggPrototype } from '../metadata';
import type { EggContainer } from './model/EggContainer';
import type { EggObject, EggObjectLifeCycleContext } from './model/EggObject';

export type ContainerGetMethod = (proto: EggPrototype) => EggContainer<LifecycleContext>;

export type CreateObjectMethod = (name: EggObjectName, proto: EggPrototype, lifecycleContext: EggObjectLifeCycleContext) => Promise<EggObject>;
