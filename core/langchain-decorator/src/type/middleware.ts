import { createMiddleware } from 'langchain';

type createMiddlewareParams = Parameters<typeof createMiddleware>['0'];

export abstract class TeggAgentMiddleware implements createMiddlewareParams {
  name;
  constructor() {
    this.name = this.constructor.name;
  }
}
