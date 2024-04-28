import { Prototype, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { DaoInfoUtil } from '../util/DaoInfoUtil';

export function Dao() {
  return function(constructor: EggProtoImplClass) {
    DaoInfoUtil.setIsDao(constructor);
    const func = Prototype({
      accessLevel: AccessLevel.PUBLIC,
      initType: ObjectInitType.SINGLETON,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
