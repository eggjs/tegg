import { EggProtoImplClass } from '../../core-decorator/index.js';

/**
 * Loader to load class list in module
 */
export interface Loader {
  load(): EggProtoImplClass[];
  // TODO impl loadProto
  // loadProto(): ProtoDescriptor[];
}
