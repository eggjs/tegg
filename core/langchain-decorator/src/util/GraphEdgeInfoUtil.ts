import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

import { GRAPH_EDGE_METADATA } from '../type/metadataKey';
import type { IGraphEdgeMetadata } from '../model/GraphEdgeMetadata';

export class GraphEdgeInfoUtil {
  static setGraphEdgeMetadata(metadata: IGraphEdgeMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(GRAPH_EDGE_METADATA, metadata, clazz);
  }

  static getGraphEdgeMetadata(clazz: EggProtoImplClass): IGraphEdgeMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_EDGE_METADATA, clazz);
  }
}
