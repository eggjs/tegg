import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { ModelMetadata } from '../model/ModelMetadata';

export const MODEL_METADATA = Symbol.for('EggPrototype#model#metadata');

export class ModelMetadataUtil {
  static setModelMetadata(clazz: EggProtoImplClass, metaData: ModelMetadata) {
    MetadataUtil.defineMetaData(MODEL_METADATA, metaData, clazz);
  }

  static getModelMetadata(clazz): ModelMetadata | undefined {
    return MetadataUtil.getOwnMetaData(MODEL_METADATA, clazz);
  }
}
