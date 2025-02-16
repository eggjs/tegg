import type { EggProtoImplClass, IndexOptions } from '@eggjs/tegg-types';
import { ModelInfoUtil } from '../util/index.js';

export function Index(fields: string[], params?: IndexOptions) {
  return function(clazz: EggProtoImplClass) {
    ModelInfoUtil.addModelIndex(fields, params, clazz);
  };
}
