import { Application, Context } from 'egg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { RocketMQMessageListenerHandler, RocketMQMetadata, TEGG_ROCKETMQ_REG, TEGG_ROCKETMQ_SYN_PREFIX } from '@eggjs/tegg-rocketmq-decorator';
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

    class RocketMQMessageListenerAdapterImpl implements RocketMQMessageListenerAdapter {
      private ctx: any;

      constructor(ctx: Context) {
        this.ctx = ctx;

        this.ctx[ROOT_PROTO] = proto;
      }

      async subscribe(): Promise<void> {
        const { ctx } = this;

        app.messenger.sendToAgent(TEGG_ROCKETMQ_REG, JSON.stringify(property));

        app.messenger.on(`${TEGG_ROCKETMQ_SYN_PREFIX}${instanceId}:${topic}:${groupId}`, (json: string) => {
          const { messageBody } = JSON.parse(json);

          this.ctx.beginModuleScope(async () => {
            try {
              const eggObject = await EggContainerFactory.getOrCreateEggObject(proto, proto.name, this.ctx.teggContext);

              (eggObject.obj as RocketMQMessageListenerHandler).handle(messageBody);
            } catch (e) {
              ctx.logger.error(e);
            }
          });
        });
      }
    }

    const ctx = app.createAnonymousContext();

    return new RocketMQMessageListenerAdapterImpl(ctx);
  }
}
