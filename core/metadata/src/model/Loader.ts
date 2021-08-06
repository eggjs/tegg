import { EggProtoImplClass } from '@eggjs/core-decorator';

/**
 * Loader to load class list in module
 */
export interface Loader {
  load(): EggProtoImplClass[];
}
