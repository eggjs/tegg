import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { ModelMetadata } from '../model/index.js';
import { ModelInfoUtil, NameUtil } from '../util/index.js';
import { IndexMetaBuilder } from './IndexMetaBuilder.js';
import { AttributeMetaBuilder } from './AttributeMetaBuilder.js';

export class ModelMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): ModelMetadata {
    const dataSource = ModelInfoUtil.getDataSource(this.clazz);
    const tableName = ModelInfoUtil.getTableName(this.clazz) || NameUtil.getTableName(this.clazz.name);
    const attributeMetaBuilder = new AttributeMetaBuilder(this.clazz);
    const attributes = attributeMetaBuilder.build();
    const indexMetaBuilder = new IndexMetaBuilder(this.clazz, attributes);
    const indices = indexMetaBuilder.build();
    return new ModelMetadata(dataSource, tableName, attributes, indices);
  }
}
