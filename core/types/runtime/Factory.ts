import type { EggObjectName } from '../core-decorator/index.js';
import type { LifecycleContext } from '../lifecycle/index.js';
import type { EggPrototype } from '../metadata/index.js';
import type { EggContainer, EggObject, EggObjectLifeCycleContext } from './model/index.js';

export type ContainerGetMethod = (proto: EggPrototype) => EggContainer<LifecycleContext>;

export type CreateObjectMethod = (name: EggObjectName, proto: EggPrototype, lifecycleContext: EggObjectLifeCycleContext) => Promise<EggObject>;
