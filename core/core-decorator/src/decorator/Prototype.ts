import { ObjectInitType, ObjectInitTypeLike } from '../enum/ObjectInitType';
import { AccessLevel } from '../enum/AccessLevel';
import { EggProtoImplClass, EggPrototypeInfo } from '../model/EggPrototypeInfo';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { NameUtil, StackUtil } from '@eggjs/tegg-common-util';


export interface PrototypeParams {
  name?: string;
  initType?: ObjectInitTypeLike;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}

export const DEFAULT_PROTO_IMPL_TYPE = 'DEFAULT';

const DEFAULT_PARAMS = {
  initType: ObjectInitType.SINGLETON,
  accessLevel: AccessLevel.PRIVATE,
  protoImplType: DEFAULT_PROTO_IMPL_TYPE,
};

export function Prototype(param?: PrototypeParams) {
  return function(clazz: EggProtoImplClass) {
    PrototypeUtil.setIsEggPrototype(clazz);
    const property: Partial<EggPrototypeInfo> = {
      ...DEFAULT_PARAMS,
      ...param,
    };
    if (!property.name) {
      property.name = NameUtil.getClassName(clazz);
    }
    PrototypeUtil.setProperty(clazz, property as EggPrototypeInfo);

    // './tegg/core/common-util/src/StackUtil.ts',
    // './tegg/core/core-decorator/src/decorator/Prototype.ts',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/test/fixtures/decators/CacheService.ts',
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 4));
  };
}
