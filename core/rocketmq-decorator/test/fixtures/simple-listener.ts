import { Context } from 'egg';
import { RocketMQMessageListener, RocketMQMessageListenerHandler } from '../..';

@RocketMQMessageListener({
  instanceId: '',
  topic: '',
  groupId: '',
})
export class SimpleListener implements RocketMQMessageListenerHandler {
  private ctx: Context;

  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  async handle(msg: string): Promise<void> {
    this.ctx.logger.info('msg: ', msg);
  }
}
