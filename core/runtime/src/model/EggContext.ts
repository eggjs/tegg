import { EggContainer } from './EggContainer';
import { LifecycleUtil } from '@eggjs/tegg-lifecycle';

export interface EggContextLifecycleContext {
}

export interface EggContext extends EggContainer<EggContextLifecycleContext> {
  // ctx get/set method
  get(key: string | symbol): any | undefined;
  set(key: string | symbol, val: any);
}

export const EggContextLifecycleUtil = new LifecycleUtil<EggContextLifecycleContext, EggContext>();
