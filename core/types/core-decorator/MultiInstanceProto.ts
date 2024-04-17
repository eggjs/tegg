import type { AccessLevel } from './enum/AccessLevel';
import type { ObjectInitTypeLike } from './enum/ObjectInitType';
import type { MultiInstancePrototypeGetObjectsContext, ObjectInfo } from './model/EggMultiInstancePrototypeInfo';

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
