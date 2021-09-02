import { MQClient } from '@aliyunmq/mq-http-sdk';

interface IRocketMQClient {
  listen(): any;
  close(): any;
  createClient(): any;
  addConsumer(): any;
}

export class RocketMQClient {
  private readonly client: MQClient;
}
