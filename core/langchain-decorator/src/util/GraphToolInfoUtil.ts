import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

import { GRAPH_TOOL_METADATA } from '../type/metadataKey';
import type { IGraphToolMetadata } from '../model/GraphToolMetadata';

export class GraphToolInfoUtil {
  static setGraphToolMetadata(metadata: IGraphToolMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(GRAPH_TOOL_METADATA, metadata, clazz);
  }

  static getGraphToolMetadata(clazz: EggProtoImplClass): IGraphToolMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_TOOL_METADATA, clazz);
  }
}
