import { IndexType } from '../enum/IndexType';
import { IndexStoreType } from '../enum/IndexStoreType';
import { IndexParams } from '../decorator/Index';
import { ColumnModel } from './ColumnModel';

export interface IndexKey {
  columnName: string;
  propertyName: string;
}

export class IndexModel {
  name: string;
  keys: IndexKey[];
  type: IndexType;

  storeType?: IndexStoreType;
  comment?: string;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;
  parser?: string;

  constructor(params: {
    name: string;
    keys: IndexKey[];
    type: IndexType;
    storeType?: IndexStoreType;
    comment?: string;
    engineAttribute?: string;
    secondaryEngineAttribute?: string;
    parser?: string;
  }) {
    this.name = params.name;
    this.keys = params.keys;
    this.type = params.type;
    this.storeType = params.storeType;
    this.comment = params.comment;
    this.engineAttribute = params.engineAttribute;
    this.secondaryEngineAttribute = params.secondaryEngineAttribute;
    this.parser = params.parser;
  }

  static buildIndexName(keys: string[], type: IndexType) {
    const prefix = type === IndexType.UNIQUE ? 'uk_' : 'idx_';
    return prefix + keys.join('_');
  }

  static build(params: IndexParams, columns: ColumnModel[]) {
    const type = params.type ?? IndexType.INDEX;
    const name = params.name ?? IndexModel.buildIndexName(params.keys, type);
    const keys: Array<IndexKey> = params.keys.map(t => {
      const column = columns.find(c => c.propertyName === t);
      if (!column) {
        throw new Error(`Index "${name}" configuration error: has no property named "${t}"`);
      }
      return {
        propertyName: column!.propertyName,
        columnName: column!.columnName,
      };
    });
    return new IndexModel({
      name,
      keys,
      type,
      storeType: params.storeType,
      comment: params.comment,
      engineAttribute: params.engineAttribute,
      secondaryEngineAttribute: params.secondaryEngineAttribute,
      parser: params.parser,
    });
  }
}
