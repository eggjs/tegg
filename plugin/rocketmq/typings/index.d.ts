import 'egg';
import '@eggjs/tegg-plugin';
import '@eggjs/tegg-config'
import { RocketMQMetadata } from '@eggjs/tegg-rocketmq-decorator';
import { RocketMQMessageListenerAdapter } from '@eggjs/tegg-rocketmq-runtime';

declare module 'egg' {
  interface Application {
    createRocketMQMessageListener: (metadata: RocketMQMetadata, adapter: RocketMQMessageListenerAdapter) => void;
  }

  interface Context {
  }
}
