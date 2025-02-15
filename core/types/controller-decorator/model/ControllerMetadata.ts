import type { EggPrototypeName } from '../../core-decorator';
import { ControllerTypeLike, MiddlewareFunc } from './types';
import { MethodMeta } from './MethodMeta';

export interface ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  readonly type: ControllerTypeLike;
  readonly methods: readonly MethodMeta[];
  readonly middlewares: readonly MiddlewareFunc[];
}
