import type { EggObjectName } from '../core-decorator/index.js';
import type { LifecycleContext } from '../lifecycle/index.js';
import type { EggPrototype } from '../metadata/model/EggPrototype.js';
import type { EggContainer } from './model/EggContainer.js';
import type { EggObject, EggObjectLifeCycleContext } from './model/EggObject.js';

export type ContainerGetMethod = (proto: EggPrototype) => EggContainer<LifecycleContext>;

export type CreateObjectMethod = (name: EggObjectName, proto: EggPrototype, lifecycleContext: EggObjectLifeCycleContext) => Promise<EggObject>;
