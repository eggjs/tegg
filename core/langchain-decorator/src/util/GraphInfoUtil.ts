import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

import { GRAPH_GRAPH_METADATA } from '../type/metadataKey';
import type { IGraphMetadata } from '../model/GraphMetadata';

export class GraphInfoUtil {
  static graphMap = new Map<EggProtoImplClass, IGraphMetadata>();

  static setGraphMetadata(metadata: IGraphMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(GRAPH_GRAPH_METADATA, metadata, clazz);
    GraphInfoUtil.graphMap.set(clazz, metadata);
  }

  static getGraphMetadata(clazz: EggProtoImplClass): IGraphMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_GRAPH_METADATA, clazz);
  }

  static getGraphByName(graphName: string): { clazz: EggProtoImplClass; metadata: IGraphMetadata } | undefined {
    for (const [ clazz, metadata ] of GraphInfoUtil.graphMap.entries()) {
      if (metadata.name === graphName) {
        return { clazz, metadata };
      }
    }
    return undefined;
  }

  static getAllGraphMetadata(): Map<EggProtoImplClass, IGraphMetadata> {
    return GraphInfoUtil.graphMap;
  }
}
