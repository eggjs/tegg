import { RocketMQMessageListener, RocketMQMessageListenerHandler } from '@eggjs/tegg-rocketmq-decorator';

export const TOPIC_SIMPLE = 'TOPIC_SIMPLE';

@RocketMQMessageListener(TOPIC_SIMPLE)
export class SimpleListener implements RocketMQMessageListenerHandler<typeof TOPIC_SIMPLE> {
  handle(msg: string): void {
    console.log('msg: ', msg);
  }
}
