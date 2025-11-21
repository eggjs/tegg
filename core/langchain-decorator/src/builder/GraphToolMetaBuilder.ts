import { EggProtoImplClass } from '@eggjs/tegg';
import { GraphToolInfoUtil } from '../util/GraphToolInfoUtil';
import { GraphToolMetadata } from '../model/GraphToolMetadata';

export class GraphToolMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphToolMetadata | undefined {
    const metadata = GraphToolInfoUtil.getGraphToolMetadata(this.clazz);
    if (metadata) {
      return new GraphToolMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphToolMetaBuilder {
    return new GraphToolMetaBuilder(clazz);
  }
}
