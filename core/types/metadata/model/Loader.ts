import { EggProtoImplClass } from '../../core-decorator';

/**
 * Loader to load class list in module
 */
export interface Loader {
  load(): EggProtoImplClass[];
}
