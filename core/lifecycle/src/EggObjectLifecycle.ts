/**
 * lifecycle hook interface for egg object
 */
export interface EggObjectLifecycle {
  /**
   * call after construct
   */
  postConstruct?(): Promise<void>;

  /**
   * call before inject deps
   */
  preInject?(): Promise<void>;

  /**
   * call after inject deps
   */
  postInject?(): Promise<void>;

  /**
   * before object is ready
   */
  init?(): Promise<void>;

  /**
   * call before destroy
   */
  preDestroy?(): Promise<void>;

  /**
   * destroy the object
   */
  destroy?(): Promise<void>;
}
