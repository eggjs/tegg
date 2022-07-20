import { AccessLevel, ContextProto, EggProtoImplClass } from '@eggjs/core-decorator';
import { ModelInfoUtil } from '../util/ModelInfoUtil';

export interface ModelParams {
  tableName?: string;
}

export const MODEL_PROTO_IMPL_TYPE = 'MODEL_PROTO';

export function Model(param?: ModelParams) {
  return function(clazz: EggProtoImplClass) {
    ModelInfoUtil.setIsModel(true, clazz);
    const func = ContextProto({
      name: clazz.name,
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: MODEL_PROTO_IMPL_TYPE,
    });
    if (param?.tableName) {
      ModelInfoUtil.setTableName(param.tableName, clazz);
    }
    func(clazz);
  };
}
