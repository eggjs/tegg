import { EggProtoImplClass } from '@eggjs/tegg';
import { GraphEdgeInfoUtil } from '../util/GraphEdgeInfoUtil';
import { GraphEdgeMetadata } from '../model/GraphEdgeMetadata';

export class GraphEdgeMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphEdgeMetadata | undefined {
    const metadata = GraphEdgeInfoUtil.getGraphEdgeMetadata(this.clazz);
    if (metadata) {
      return new GraphEdgeMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphEdgeMetaBuilder {
    return new GraphEdgeMetaBuilder(clazz);
  }
}
