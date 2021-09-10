import { AccessLevel, ContextProto, EggProtoImplClass } from '@eggjs/core-decorator';
import { ModelInfoUtil } from '../util/ModelInfoUtil';

export interface ModelParams {
  tableName?: string;
}

export function Model(param?: ModelParams) {
  return function(clazz: EggProtoImplClass) {
    ModelInfoUtil.setIsModel(true, clazz);
    const func = ContextProto({
      accessLevel: AccessLevel.PUBLIC,
    });
    if (param?.tableName) {
      ModelInfoUtil.setTableName(param.tableName, clazz);
    }
    func(clazz);
  };
}
