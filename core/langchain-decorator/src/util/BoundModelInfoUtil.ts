import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { BOUND_MODEL_METADATA } from '../type/metadataKey.ts';
import type { IBoundModelMetadata } from '../model/BoundModelMetadata.ts';

export class BoundModelInfoUtil {
  static setBoundModelMetadata(metadata: IBoundModelMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(BOUND_MODEL_METADATA, metadata, clazz);
  }

  static getBoundModelMetadata(clazz: EggProtoImplClass): IBoundModelMetadata | undefined {
    return MetadataUtil.getMetaData(BOUND_MODEL_METADATA, clazz);
  }
}
