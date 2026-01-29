import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

import { GRAPH_TOOL_METADATA } from '../type/metadataKey';
import type { IGraphToolMetadata } from '../model/GraphToolMetadata';

export class GraphToolInfoUtil {
  static graphToolMap = new Map<EggProtoImplClass, IGraphToolMetadata>();
  static setGraphToolMetadata(metadata: IGraphToolMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(GRAPH_TOOL_METADATA, metadata, clazz);
    GraphToolInfoUtil.graphToolMap.set(clazz, metadata);
  }

  static getGraphToolMetadata(clazz: EggProtoImplClass): IGraphToolMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_TOOL_METADATA, clazz);
  }

  static getAllGraphToolMetadata(): Map<EggProtoImplClass, IGraphToolMetadata> {
    return GraphToolInfoUtil.graphToolMap;
  }
}
