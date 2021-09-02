import { Application, Context } from 'egg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { RocketMQMessageListenerHandler, RocketMQMetadata } from '@eggjs/tegg-rocketmq-decorator';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export interface RocketMQMessageListenerAdapter {
  subscribe(): Promise<void>;
}

export class RocketMQMessageListenerFactory {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public createInstance(proto: EggPrototype, property: RocketMQMetadata): RocketMQMessageListenerAdapter {
    const { app } = this;

    const {
      instanceId = '',
      topic = '',
      groupId = '',
    } = property;

    const signal = `${instanceId}:${topic}:${groupId}`;

    class RocketMQMessageListenerAdapterImpl implements RocketMQMessageListenerAdapter {
      ctx: any;

      constructor(ctx: Context) {
        this.ctx = ctx;

        this.ctx[ROOT_PROTO] = proto;
      }

      async subscribe(): Promise<void> {
        app.messenger.on(signal, (data: string) => {
          this.ctx.beginModuleScope(async () => {
            const eggObject = await EggContainerFactory.getOrCreateEggObject(proto, proto.name, this.ctx.teggContext);

            (eggObject.obj as RocketMQMessageListenerHandler).handle(data);
          });
        });
      }
    }

    const ctx = app.createAnonymousContext();

    return new RocketMQMessageListenerAdapterImpl(ctx);
  }
}
