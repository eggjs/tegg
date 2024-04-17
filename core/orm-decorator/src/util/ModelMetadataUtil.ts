import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { ModelMetadata } from '../model/ModelMetadata';

export const MODEL_METADATA = Symbol.for('EggPrototype#model#metadata');

export class ModelMetadataUtil {
  static setModelMetadata(clazz: EggProtoImplClass, metaData: ModelMetadata) {
    MetadataUtil.defineMetaData(MODEL_METADATA, metaData, clazz);
  }

  static getModelMetadata(clazz): ModelMetadata | undefined {
    return MetadataUtil.getMetaData(MODEL_METADATA, clazz);
  }
}
