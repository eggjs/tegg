import { EggProtoImplClass } from '@eggjs/core-decorator';
import { ModelInfoUtil } from '../util/ModelInfoUtil';

export function DataSource(dataSource: string) {
  return function(clazz: EggProtoImplClass) {
    ModelInfoUtil.setDataSource(dataSource, clazz);
  };
}
