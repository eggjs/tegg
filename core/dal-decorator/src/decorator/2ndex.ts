import type { EggProtoImplClass, IndexParams } from '@eggjs/tegg-types';
import { IndexInfoUtil } from '../util/IndexInfoUtil.js';

export function Index(params: IndexParams) {
  return function(constructor: EggProtoImplClass) {
    IndexInfoUtil.addIndex(constructor, params);
  };
}
