import { MQClient } from '@aliyunmq/mq-http-sdk';
import { Application } from 'egg';
import { TEGG_ROCKETMQ_SYN_PREFIX } from '@eggjs/tegg-rocketmq-decorator';

interface RocketMQClientLifecycle {
  listen(): any;
  addMessageHandler(handlerProperties: string): any;
}

interface HandlerProperties {
  instanceId: string;
  topic: string;
  groupId: string;
  promise?: Promise<any>;
}

export class RocketMQClient implements RocketMQClientLifecycle {
  private agent: Application;
  private client: MQClient;
  private messageHandlers: Map<string, HandlerProperties>;

  constructor(agent: Application) {
    const { endpoint, accessKeyId, accessKeySecret } = agent.config.rocketmq;
    this.agent = agent;
    this.messageHandlers = new Map<string, HandlerProperties>();
    this.client = new MQClient(endpoint, accessKeyId, accessKeySecret);
  }

  public listen = () => {
    this.messageHandlers.forEach(messageHandler => {
      const { instanceId, topic, groupId, promise } = messageHandler;
      if (promise) {
        return;
      }
      messageHandler.promise = this.consumeMessage(instanceId, topic, groupId).then(() => {
        messageHandler.promise = undefined;
        process.nextTick(this.listen);
      });
    });
  };

  public addMessageHandler = (stringifyHandlerProperties: string) => {
    const handlerProperties = JSON.parse(stringifyHandlerProperties) as HandlerProperties;
    const { topic, groupId, instanceId } = handlerProperties;
    const name = `${topic}:${groupId}:${instanceId}`;
    this.messageHandlers.set(name, handlerProperties);
  };

  private async consumeMessage(instanceId: string, topic: string, groupId: string): Promise<void> {
    const { agent } = this;
    try {
      const consumer = this.client.getConsumer(instanceId, topic, groupId);
      const resp = await consumer.consumeMessage(4, 8);
      if (resp.code !== 200) {
        return;
      }

      const ackResp = await consumer.ackMessage(resp.body.map(res => res.ReceiptHandle));

      if (ackResp.code !== 204) {
        return;
      }

      // sync
      resp.body.forEach(message => {
        agent.messenger.sendRandom(`${TEGG_ROCKETMQ_SYN_PREFIX}${instanceId}:${topic}:${groupId}`, JSON.stringify({
          messageId: message.MessageId,
          messageBody: message.MessageBody,
        }));
      });

    } catch (e) {
      if (e.Code.indexOf('MessageNotExist') > -1) {
        // 没有消息，则继续长轮询服务器。
        console.log('message not exist, RequestId:%s, Code:%s', e.RequestId, e.Code);
      } else {
        console.error(e);
      }
    }
  }
}
