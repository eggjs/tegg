import type { IndexStoreType } from '../enum/IndexStoreType.js';
import type { IndexType } from '../enum/IndexType.js';

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
