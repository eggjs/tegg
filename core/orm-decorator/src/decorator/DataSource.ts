import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { ModelInfoUtil } from '../util/index.js';

export function DataSource(dataSource: string) {
  return function(clazz: EggProtoImplClass) {
    ModelInfoUtil.setDataSource(dataSource, clazz);
  };
}
