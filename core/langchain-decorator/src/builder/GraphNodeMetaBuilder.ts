import { EggProtoImplClass } from '@eggjs/tegg';
import { GraphNodeInfoUtil } from '../util/GraphNodeInfoUtil';
import { GraphNodeMetadata } from '../model/GraphNodeMetadata';

export class GraphNodeMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphNodeMetadata | undefined {
    const metadata = GraphNodeInfoUtil.getGraphNodeMetadata(this.clazz);
    if (metadata) {
      return new GraphNodeMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphNodeMetaBuilder {
    return new GraphNodeMetaBuilder(clazz);
  }
}
