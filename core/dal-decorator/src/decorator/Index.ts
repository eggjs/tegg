import { IndexType } from '../enum/IndexType';
import { IndexStoreType } from '../enum/IndexStoreType';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import { IndexInfoUtil } from '../util/IndexInfoUtil';

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

export function Index(params: IndexParams) {
  return function(constructor: EggProtoImplClass) {
    IndexInfoUtil.addIndex(constructor, params);
  };
}
