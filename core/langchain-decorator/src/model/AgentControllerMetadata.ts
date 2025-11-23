import { ControllerType, EggPrototypeName, MiddlewareFunc } from '@eggjs/tegg-types';

export type AgentControllerType = 'HTTP';

export interface IAgentControllerMetadata {
  protoName?: string;
  controllerName?: string;
  path?: string;
  timeout?: number;
  controllerType?: AgentControllerType;
  stream?: boolean;
}

export class AgentControllerMetadata {
  className: string;
  methods: never[] = [];
  middlewares: readonly MiddlewareFunc[];
  protoName: EggPrototypeName;
  controllerName: string;
  type = ControllerType.AGENT;
  path?: string;
  timeout: number;
  controllerType?: AgentControllerType;
  stream?: boolean;

  constructor(params: IAgentControllerMetadata, className: string, middlewares: MiddlewareFunc[]) {
    this.path = params.path;
    this.timeout = params.timeout ?? 60000;
    this.controllerName = params.controllerName!;
    this.protoName = params.protoName as EggPrototypeName;
    this.controllerType = params.controllerType;
    this.className = className;
    this.middlewares = middlewares;
    this.stream = !!params.stream;
  }
}
