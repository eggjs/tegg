import { ControllerRegister } from '@eggjs/tegg-controller-plugin/lib/ControllerRegister';
import { RootProtoManager } from '@eggjs/tegg-controller-plugin/lib/RootProtoManager';
import { AgentControllerMetadata } from '@eggjs/tegg-langchain-decorator';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { ControllerMetadata, ControllerType, EggPrototype } from '@eggjs/tegg-types';
import { Application, Context, Router } from 'egg';
import pathToRegexp from 'path-to-regexp';
import assert from 'node:assert';
import { CompiledStateGraph } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { TimerUtil } from '@eggjs/tegg-common-util';
import { Readable, Transform } from 'node:stream';

export class AgentControllerRegister implements ControllerRegister {
  private readonly app: Application;
  private readonly controllerMeta: AgentControllerMetadata;
  private readonly proto: EggPrototype;
  private readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly router: Router;

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application) {
    assert(controllerMeta.type === ControllerType.AGENT, 'controller meta type is not AGENT');
    return new AgentControllerRegister(proto, controllerMeta as AgentControllerMetadata, app);
  }

  constructor(proto: EggPrototype, controllerMeta: AgentControllerMetadata, app: Application) {
    this.proto = proto;
    this.controllerMeta = controllerMeta;
    this.app = app;
    this.eggContainerFactory = app.eggContainerFactory;
    this.router = this.app.router;
  }

  createHandler() {
    const self = this;
    return async function(ctx: Context) {
      const eggObj = await self.eggContainerFactory.getOrCreateEggObject(self.proto, self.proto.name);
      const compiledEggObj = await self.eggContainerFactory.getOrCreateEggObjectFromName(`compiled${eggObj.name[0].toUpperCase()}${(eggObj.name as string).slice(1)}`);
      const invokeFunc = (compiledEggObj.obj as CompiledStateGraph<any, any>).invoke;
      const streamFunc = (compiledEggObj.obj as CompiledStateGraph<any, any>).stream;
      const args = ctx.request.body;
      const genArgs = Object.entries(args).reduce((acc, [ key, value ]) => {
        if (Array.isArray(value) && typeof value[0] === 'object') {
          acc[key] = value.map(obj => {
            switch (obj.role) {
              case 'human':
                return new HumanMessage(obj);
              case 'ai':
                return new AIMessage(obj);
              case 'system':
                return new SystemMessage(obj);
              case 'tool':
                return new ToolMessage(obj);
              default:
                throw new Error('unknown message type');
            }
          });
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});

      const defaultConfig = {
        configurable: {
          thread_id: process.pid.toString(),
        },
      };

      let body: unknown;
      try {
        body = await TimerUtil.timeout<unknown>(() => Reflect.apply(self.controllerMeta.stream ? streamFunc : invokeFunc, compiledEggObj.obj, [ genArgs, defaultConfig ]), self.controllerMeta.timeout);
      } catch (e: any) {
        if (e instanceof TimerUtil.TimeoutError) {
          ctx.logger.error(`timeout after ${self.controllerMeta.timeout}ms`);
          ctx.throw(500, 'timeout');
        }
        throw e;
      }

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
        if (self.controllerMeta.stream) {
          ctx.set({
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'transfer-encoding': 'chunked',
            'X-Accel-Buffering': 'no',
          });
          const transformStream = new Transform({
            objectMode: true,
            transform(chunk: any, _encoding: string, callback) {
              try {
                // 如果 chunk 是对象，转换为 JSON
                let data: string;
                if (typeof chunk === 'string') {
                  data = chunk;
                } else if (typeof chunk === 'object') {
                  data = JSON.stringify(chunk);
                } else {
                  data = String(chunk);
                }

                // 格式化为 SSE 格式
                const sseFormatted = `data: ${data}\n\n`;
                callback(null, sseFormatted);
              } catch (error) {
                callback(error);
              }
            },
          });
          ctx.body = Readable.fromWeb(body as any, { objectMode: true }).pipe(transformStream);
        } else {
          ctx.body = body;
        }
      }
    };
  }

  async register(rootProtoManager: RootProtoManager) {
    const middleware = this.controllerMeta.middlewares;
    const methodName = this.controllerMeta.className + '.invoke';
    const methodRealPath = this.controllerMeta.path!;
    const regExp = pathToRegexp(methodRealPath, {
      sensitive: true,
    });
    const handler = this.createHandler();
    Reflect.apply(this.router.post, this.router,
      [ methodName, methodRealPath, ...middleware, handler ]);
    rootProtoManager.registerRootProto('AgentControllerInvoke', (ctx: Context) => {
      if (regExp.test(ctx.path)) {
        return this.proto;
      }
    }, '');
  }
}
