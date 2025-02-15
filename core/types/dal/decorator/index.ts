import type { IndexStoreType, IndexType } from '../enum/index.js';

export interface IndexParams {
  keys: string[];
  name?: string;
  type?: IndexType,
  storeType?: IndexStoreType;
  comment?: string;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;
  parser?: string;
}

export * from './Column.js';
export * from './DataSourceQualifier.js';
export * from './Table.js';
