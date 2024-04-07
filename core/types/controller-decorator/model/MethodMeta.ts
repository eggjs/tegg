import { MiddlewareFunc } from './types';

export interface MethodMeta {
  readonly name: string;
  readonly middlewares: readonly MiddlewareFunc[];
  readonly contextParamIndex: number | undefined;
}
