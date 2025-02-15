import type { AccessLevel } from './enum/AccessLevel.js';
import type { ObjectInitTypeLike } from './enum/ObjectInitType.js';
import type { MultiInstancePrototypeGetObjectsContext, ObjectInfo } from './model/EggMultiInstancePrototypeInfo.js';

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
