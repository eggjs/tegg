import {
  AccessLevel,
  EggProtoImplClass,
  ObjectInitType,
  Prototype,
  PrototypeParams, PrototypeUtil,
} from '@eggjs/core-decorator';
import { AdviceInfoUtil } from '../util/AdviceInfoUtil';
import { StackUtil } from '@eggjs/tegg-common-util';

export interface AdviceContext<T = object, K = any> {
  that: T;
  method: PropertyKey;
  args: any[];
  adviceParams?: K;
}

/**
 * execute order:
 * 1. beforeCall
 * 1. around
 * 1. afterReturn/afterThrow
 * 1. afterFinally
 */
export interface IAdvice<T = object> {
  /**
   * call before function
   * @param ctx
   */
  beforeCall?(ctx: AdviceContext<T>): Promise<void>;

  /**
   * call after function succeed
   */
  afterReturn?(ctx: AdviceContext<T>, result: any): Promise<void>;

  /**
   * call after function throw error
   */
  afterThrow?(ctx: AdviceContext<T>, error: Error): Promise<void>;

  /**
   * always call after function done
   */
  afterFinally?(ctx: AdviceContext<T>): Promise<void>;

  /**
   * execute the function
   * the only one can modify the function return value
   */
  around?(ctx: AdviceContext<T>, next: () => Promise<any>): Promise<any>;
}

const defaultAdviceParam = {
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.CONTEXT,
};

export function Advice(param?: PrototypeParams) {
  return function(constructor: EggProtoImplClass<IAdvice>) {
    AdviceInfoUtil.setIsAdvice(true, constructor);
    const func = Prototype({
      ...defaultAdviceParam,
      ...param,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
