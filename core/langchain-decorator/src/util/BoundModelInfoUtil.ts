import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

import { BOUND_MODEL_METADATA } from '../type/metadataKey';
import type { IBoundModelMetadata } from '../model/BoundModelMetadata';

export class BoundModelInfoUtil {
  static setBoundModelMetadata(metadata: IBoundModelMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(BOUND_MODEL_METADATA, metadata, clazz);
  }

  static getBoundModelMetadata(clazz: EggProtoImplClass): IBoundModelMetadata | undefined {
    return MetadataUtil.getMetaData(BOUND_MODEL_METADATA, clazz);
  }
}
