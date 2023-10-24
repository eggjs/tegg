import assert from 'assert';
import KoaRouter from 'koa-router';
import { Context } from 'egg';
import {
  EggContext,
  HTTPControllerMeta,
  HTTPMethodMeta,
  HTTPParamType,
  Next,
  PathParamMeta,
  QueriesParamMeta,
  QueryParamMeta,
} from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { RootProtoManager } from '../../RootProtoManager';
import pathToRegexp from 'path-to-regexp';
import { aclMiddlewareFactory } from './Acl';
import { RouterConflictError } from '../../errors';
import { FrameworkErrorFormater } from 'egg-errors';
import { EggRouter } from '@eggjs/router';

const noop = () => {
  // ...
};

export class HTTPMethodRegister {
  private readonly router: KoaRouter<any, Context>;
  private readonly checkRouters: Map<string, KoaRouter<any, Context>>;
  private readonly controllerMeta: HTTPControllerMeta;
  private readonly methodMeta: HTTPMethodMeta;
  private readonly proto: EggPrototype;
  private readonly eggContainerFactory: typeof EggContainerFactory;

  constructor(
    proto: EggPrototype,
    controllerMeta: HTTPControllerMeta,
    methodMeta: HTTPMethodMeta,
    router: KoaRouter<any, Context>,
    checkRouters: Map<string, KoaRouter<any, Context>>,
    eggContainerFactory: typeof EggContainerFactory,
  ) {
    this.proto = proto;
    this.controllerMeta = controllerMeta;
    this.router = router;
    this.methodMeta = methodMeta;
    this.checkRouters = checkRouters;
    this.eggContainerFactory = eggContainerFactory;
  }

  private createHandler(methodMeta: HTTPMethodMeta, host: string | undefined) {
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    const self = this;
    return async function(ctx: Context, next: Next) {
      // if hosts is not empty and host is not matched, not execute
      if (host && host !== ctx.host) {
        return await next();
      }
      // HTTP decorator core implement
      // use controller metadata map http request to function arguments
      const eggObj = self.eggContainerFactory.getEggObject(self.proto, self.proto.name, (ctx as any)[TEGG_CONTEXT]);
      const realObj = eggObj.obj;
      const realMethod = realObj[methodMeta.name];
      const args: Array<object | string | string[]> = new Array(methodArgsLength);
      if (hasContext) {
        args[contextIndex!] = ctx;
      }
      for (const [ index, param ] of methodMeta.paramMap) {
        switch (param.type) {
          case HTTPParamType.BODY: {
            args[index] = ctx.request.body;
            break;
          }
          case HTTPParamType.PARAM: {
            const pathParam: PathParamMeta = param as PathParamMeta;
            args[index] = ctx.params[pathParam.name];
            break;
          }
          case HTTPParamType.QUERY: {
            const queryParam: QueryParamMeta = param as QueryParamMeta;
            args[index] = ctx.query[queryParam.name];
            break;
          }
          case HTTPParamType.QUERIES: {
            const queryParam: QueriesParamMeta = param as QueriesParamMeta;
            args[index] = ctx.queries[queryParam.name];
            break;
          }
          case HTTPParamType.REQUEST: {
            args[index] = ctx.request;
            break;
          }
          default:
            assert.fail('never arrive');
        }
      }
      const body = await Reflect.apply(realMethod, realObj, args);
      // https://github.com/koajs/koa/blob/master/lib/response.js#L88
      // ctx.status is set
      const explicitStatus = (ctx.response as any)._explicitStatus;

      if (
        // has body
        body != null ||
        // status is not set and has no body
        // code should by 204
        // https://github.com/koajs/koa/blob/master/lib/response.js#L140
        !explicitStatus
      ) {
        ctx.body = body;
      }
    };
  }

  checkDuplicate() {
    // 1. check duplicate with egg controller
    this.checkDuplicateInRouter(this.router);

    // 2. check duplicate with host tegg controller
    let hostRouter;
    const host = this.controllerMeta.getMethodHost(this.methodMeta);
    if (host) {
      hostRouter = this.checkRouters.get(host);
      if (!hostRouter) {
        hostRouter = new EggRouter({ sensitive: true }, {});
        this.checkRouters.set(host, hostRouter!);
      }
    }
    if (hostRouter) {
      this.checkDuplicateInRouter(hostRouter);
      this.registerToRouter(hostRouter);
    }
  }

  private registerToRouter(router: KoaRouter<any, Context>) {
    const routerFunc = router[this.methodMeta.method.toLowerCase()];
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    Reflect.apply(routerFunc, router, [ methodName, methodRealPath, noop ]);
  }

  private checkDuplicateInRouter(router: KoaRouter<any, Context>) {
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const matched = router.match(methodRealPath, this.methodMeta.method);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    if (matched.route) {
      const [ layer ] = matched.path;
      const err = new RouterConflictError(`register http controller ${methodName} failed, ${this.methodMeta.method} ${methodRealPath} is conflict with exists rule ${layer.path}`);
      throw FrameworkErrorFormater.format(err);
    }
  }

  register(rootProtoManager: RootProtoManager) {
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    const routerFunc = this.router[this.methodMeta.method.toLowerCase()];
    const methodMiddlewares = this.controllerMeta.getMethodMiddlewares(this.methodMeta);
    const aclMiddleware = aclMiddlewareFactory(this.controllerMeta, this.methodMeta);
    if (aclMiddleware) {
      methodMiddlewares.push(aclMiddleware);
    }
    const host = this.controllerMeta.getMethodHost(this.methodMeta);
    const handler = this.createHandler(this.methodMeta, host);
    Reflect.apply(routerFunc, this.router,
      [ methodName, methodRealPath, ...methodMiddlewares, handler ]);

    // https://github.com/eggjs/egg-core/blob/0af6178022e7734c4a8b17bb56d592b315207883/lib/egg.js#L279
    const regExp = pathToRegexp(methodRealPath, {
      sensitive: true,
    });
    rootProtoManager.registerRootProto(this.methodMeta.method, (ctx: EggContext) => {
      if (regExp.test(ctx.path)) {
        return this.proto;
      }
    }, host || '');
  }
}
