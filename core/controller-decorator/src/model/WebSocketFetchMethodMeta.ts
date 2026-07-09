import { WebSocketFetchMethodType } from '@eggjs/tegg-types';
import type { MethodMeta, MiddlewareFunc } from '@eggjs/tegg-types';
import { WebSocketParamMeta } from './WebSocketMethodMeta';

export class WebSocketFetchMethodMeta implements MethodMeta {
  public readonly name: string;
  public readonly path: string;
  public readonly middlewares: readonly MiddlewareFunc[];
  public readonly contextParamIndex: number | undefined;
  public readonly paramMap: Map<number, WebSocketParamMeta>;
  public readonly priority: number;
  public readonly hosts: string[] | undefined;
  public readonly methodType: WebSocketFetchMethodType;

  constructor(
    name: string,
    path: string,
    middlewares: MiddlewareFunc[],
    contextParamIndex: number | undefined,
    paramMap: Map<number, WebSocketParamMeta>,
    priority: number,
    hosts: string[] | undefined,
    methodType: WebSocketFetchMethodType,
  ) {
    this.name = name;
    this.path = path;
    this.middlewares = middlewares;
    this.contextParamIndex = contextParamIndex;
    this.paramMap = paramMap;
    this.priority = priority;
    this.hosts = hosts;
    this.methodType = methodType;
  }
}
