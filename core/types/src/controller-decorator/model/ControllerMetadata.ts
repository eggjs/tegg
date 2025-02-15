import type { EggPrototypeName } from '../../core-decorator/index.js';
import { ControllerTypeLike, MiddlewareFunc } from './types.js';
import { MethodMeta } from './MethodMeta.js';

export interface ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  readonly type: ControllerTypeLike;
  readonly methods: readonly MethodMeta[];
  readonly middlewares: readonly MiddlewareFunc[];
}
