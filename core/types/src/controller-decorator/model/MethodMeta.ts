import { MiddlewareFunc } from './types.js';

export interface MethodMeta {
  readonly name: string;
  readonly middlewares: readonly MiddlewareFunc[];
  readonly contextParamIndex: number | undefined;
}
