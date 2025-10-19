import { EggProtoImplClass } from '@eggjs/tegg';
import { GraphInfoUtil } from '../util/GraphInfoUtil';
import { GraphMetadata } from '../model/GraphMetadata';

export class GraphMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphMetadata | undefined {
    const metadata = GraphInfoUtil.getGraphMetadata(this.clazz);
    if (metadata) {
      return new GraphMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphMetaBuilder {
    return new GraphMetaBuilder(clazz);
  }
}
