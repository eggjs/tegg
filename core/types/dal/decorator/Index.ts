import type { IndexStoreType } from '../enum/IndexStoreType';
import type { IndexType } from '../enum/IndexType';

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
