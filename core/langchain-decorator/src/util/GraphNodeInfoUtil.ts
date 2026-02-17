import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { GRAPH_NODE_METADATA } from '../type/metadataKey.ts';
import type { IGraphNodeMetadata } from '../model/GraphNodeMetadata.ts';

export class GraphNodeInfoUtil {
  static setGraphNodeMetadata(metadata: IGraphNodeMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(GRAPH_NODE_METADATA, metadata, clazz);
  }

  static getGraphNodeMetadata(clazz: EggProtoImplClass): IGraphNodeMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_NODE_METADATA, clazz);
  }
}
