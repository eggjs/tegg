import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

import { GRAPH_NODE_METADATA } from '../type/metadataKey';
import type { IGraphNodeMetadata } from '../model/GraphNodeMetadata';

export class GraphNodeInfoUtil {
  static setGraphNodeMetadata(metadata: IGraphNodeMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(GRAPH_NODE_METADATA, metadata, clazz);
  }

  static getGraphNodeMetadata(clazz: EggProtoImplClass): IGraphNodeMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_NODE_METADATA, clazz);
  }
}
