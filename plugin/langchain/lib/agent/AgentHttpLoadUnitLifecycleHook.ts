import {
  ConfigSourceQualifier,
  Context,
  HTTPBody,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  LifecycleHook,
} from '@eggjs/tegg';
import { ClassProtoDescriptor, EggContainerFactory, EggPrototypeCreatorFactory, EggPrototypeFactory, ProtoDescriptorHelper } from '@eggjs/tegg/helper';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';
import { ModuleConfig, ModuleReference } from 'egg';
import { LangChainConfigSchemaType } from 'typings';
import { Readable, Transform } from 'stream';
import { CompiledStateGraph } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';


export interface ModuleConfigHolder {
  name: string;
  config: ModuleConfig;
  reference: ModuleReference;
}

type ValueOf<T> = T[keyof T];

export class AgentHttpLoadUnitLifecycleHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  readonly moduleConfigs: Record<string, ModuleConfigHolder>;

  constructor(moduleConfigs: Record<string, ModuleConfigHolder>) {
    this.moduleConfigs = moduleConfigs;
  }

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const moduleConfigs = this.#getModuleConfig(loadUnit);
    if (moduleConfigs.length > 0) {
      for (const [ graphName, config ] of moduleConfigs) {
        if (config?.type === 'http') {
          const GraphHttpController = this.#createGraphHttpControllerClass(loadUnit, graphName, config);
          const protoDescriptor = ProtoDescriptorHelper.createByInstanceClazz(GraphHttpController, {
            moduleName: loadUnit.name,
            unitPath: loadUnit.unitPath,
          }) as ClassProtoDescriptor;

          const proto = await EggPrototypeCreatorFactory.createProtoByDescriptor(protoDescriptor, loadUnit);
          EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
        }
      }
    }
  }

  #createGraphHttpControllerClass(loadUnit: LoadUnit, graphName: string, config: ValueOf<LangChainConfigSchemaType['agents']>) {
    class GraphHttpController {
      @HTTPMethod({
        path: config.path!,
        method: HTTPMethodEnum.POST,
        timeout: config.timeout,
      })
      async invoke(@Context() ctx, @HTTPBody() args) {
        const eggObj = await EggContainerFactory.getOrCreateEggObjectFromName(`compiled${graphName}`);
        const invokeFunc = (eggObj.obj as CompiledStateGraph<any, any>).invoke;
        const streamFunc = (eggObj.obj as CompiledStateGraph<any, any>).stream;
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

        const res = await Reflect.apply(config.stream ? streamFunc : invokeFunc, (eggObj.obj as CompiledStateGraph<any, any>), [ genArgs, defaultConfig ]);

        if (config.stream) {
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
          return Readable.fromWeb(res as any, { objectMode: true }).pipe(transformStream);
        }
        return res;
      }
    }
    HTTPController({ controllerName: `${graphName}HttpController`, protoName: `${graphName}HttpController` })(GraphHttpController);
    ConfigSourceQualifier(loadUnit.name)(GraphHttpController.prototype, 'moduleConfig');

    return GraphHttpController;
  }

  #getModuleConfig(loadUnit: LoadUnit) {
    const moduleConfig: LangChainConfigSchemaType = (this.moduleConfigs[loadUnit.name]?.config as any)?.langchain;
    if (moduleConfig && Object.keys(moduleConfig?.agents || {}).length > 0) {
      return Object.entries(moduleConfig.agents);
    }
    return [];
  }
}
