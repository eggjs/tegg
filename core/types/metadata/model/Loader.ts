import { EggProtoImplClass } from '../../core-decorator';

export interface LoadAsyncOptions {
  /** Maximum synchronous work between event-loop yields, in milliseconds. */
  yieldIntervalMs?: number;
}

/**
 * Loader to load class list in module
 */
export interface Loader {
  load(): EggProtoImplClass[];
  /**
   * Load classes without monopolizing the event loop during application
   * bootstrap. Loaders that do not need cooperative scheduling can omit it.
   */
  loadAsync?(options?: LoadAsyncOptions): Promise<EggProtoImplClass[]>;
  // TODO impl loadProto
  // loadProto(): ProtoDescriptor[];
}
