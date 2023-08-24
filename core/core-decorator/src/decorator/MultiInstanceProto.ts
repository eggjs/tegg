import { ObjectInitType, ObjectInitTypeLike } from '../enum/ObjectInitType';
import { AccessLevel } from '../enum/AccessLevel';
import { DEFAULT_PROTO_IMPL_TYPE } from './Prototype';
import {
  EggMultiInstanceCallbackPrototypeInfo,
  EggMultiInstancePrototypeInfo,
  MultiInstancePrototypeGetObjectsContext,
  ObjectInfo,
} from '../model/EggMultiInstancePrototypeInfo';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';
import { PrototypeUtil } from '../util/PrototypeUtil';
import { StackUtil } from '@eggjs/tegg-common-util';

const DEFAULT_PARAMS = {
  initType: ObjectInitType.SINGLETON,
  accessLevel: AccessLevel.PRIVATE,
  protoImplType: DEFAULT_PROTO_IMPL_TYPE,
};

export interface BaseMultiInstancePrototypeCallbackParams {
  /**
   * obj init type
   */
  initType?: ObjectInitTypeLike;
  /**
   * access level
   */
  accessLevel?: AccessLevel;
  /**
   * EggPrototype implement type
   */
  protoImplType?: string;
}

export interface MultiInstancePrototypeCallbackParams extends BaseMultiInstancePrototypeCallbackParams {
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext): ObjectInfo[];
}

export interface MultiInstancePrototypeStaticParams extends BaseMultiInstancePrototypeCallbackParams {
  /**
   * object info list
   */
  objects: ObjectInfo[];
}

export type MultiInstancePrototypeParams = MultiInstancePrototypeCallbackParams | MultiInstancePrototypeStaticParams;

export function MultiInstanceProto(param: MultiInstancePrototypeParams) {
  return function(clazz: EggProtoImplClass) {
    PrototypeUtil.setIsEggMultiInstancePrototype(clazz);
    if ((param as MultiInstancePrototypeStaticParams).objects) {
      const property: EggMultiInstancePrototypeInfo = {
        ...DEFAULT_PARAMS,
        ...param as MultiInstancePrototypeStaticParams,
      };
      PrototypeUtil.setMultiInstanceStaticProperty(clazz, property);
    } else if ((param as MultiInstancePrototypeCallbackParams).getObjects) {
      const property: EggMultiInstanceCallbackPrototypeInfo = {
        ...DEFAULT_PARAMS,
        ...param as MultiInstancePrototypeCallbackParams,
      };
      PrototypeUtil.setMultiInstanceCallbackProperty(clazz, property);
    }


    // './tegg/core/common-util/src/StackUtil.ts',
    // './tegg/core/core-decorator/src/decorator/Prototype.ts',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/test/fixtures/decators/CacheService.ts',
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 4));
  };
}
