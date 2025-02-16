import { AttributeMeta } from './AttributeMeta.js';
import { IndexMeta } from './IndexMeta.js';

export class ModelMetadata {
  readonly dataSource: string | undefined;
  readonly tableName: string;
  readonly attributes: Array<AttributeMeta>;
  readonly indices: Array<IndexMeta>;

  constructor(dataSource: string | undefined, tableName: string, attributes: Array<AttributeMeta>, indices: Array<IndexMeta>) {
    this.dataSource = dataSource;
    this.tableName = tableName;
    this.attributes = attributes;
    this.indices = indices;
  }
}
