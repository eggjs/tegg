import type { EggObject, EggObjectLifeCycleContext } from '@eggjs/tegg-runtime';

/**
 * lifecycle hook interface for egg object
 */
export interface EggObjectLifecycle {
  /**
   * call after construct
   */
  postConstruct?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * call before inject deps
   */
  preInject?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * call after inject deps
   */
  postInject?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * before object is ready
   */
  init?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * call before destroy
   */
  preDestroy?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;

  /**
   * destroy the object
   */
  destroy?(ctx: EggObjectLifeCycleContext, eggObj: EggObject): Promise<void>;
}
