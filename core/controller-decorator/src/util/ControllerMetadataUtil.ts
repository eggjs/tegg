import { ControllerMetadata } from '../model/ControllerMetadata';
import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { ControllerMetaBuilderFactory } from '../builder/ControllerMetaBuilderFactory';

export const CONTROLLER_META_DATA = Symbol.for('EggPrototype#controller#metaData');

export class ControllerMetadataUtil {
  static setControllerMetadata(clazz: EggProtoImplClass, metaData: ControllerMetadata) {
    MetadataUtil.defineMetaData(CONTROLLER_META_DATA, metaData, clazz);
  }

  static getControllerMetadata(clazz): ControllerMetadata | undefined {
    let metadata: ControllerMetadata | undefined = MetadataUtil.getOwnMetaData(CONTROLLER_META_DATA, clazz);
    if (metadata) {
      return metadata;
    }
    const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(clazz);
    if (!builder) {
      return;
    }
    metadata = builder.build();
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(clazz, metadata);
    }
    return metadata;
  }
}
