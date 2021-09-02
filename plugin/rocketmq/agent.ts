import { Application } from 'egg';
import { MQClient } from '@aliyunmq/mq-http-sdk';
import assert from 'assert';

const EGG_READY = 'egg-ready';
const ROCKETMQ_REGISTER = 'rocketmq-register';
const ROCKETMQ_PREFIX = 'rocketmq';

enum RocketMQInstanceStatus {
  INITIAL = 'INITIAL',
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
}

interface RocketMQInstance {
  consumer: any;
  key: string;
  status: RocketMQInstanceStatus;
}

export default class RocketMQAgentHook {
  private readonly agent: Application;
  private readonly client: MQClient;
  private readonly instances: RocketMQInstance[];

  constructor(agent: Application) {
    assert(agent.config.rocketmq);
    const { endpoint, accessKeyId, accessKeySecret } = agent.config.rocketmq || {};
    this.agent = agent;
    this.client = new MQClient(endpoint, accessKeyId, accessKeySecret);
  }

  async willReady() {
    this.agent.messenger.on(EGG_READY, async () => {
      // register
      this.agent.messenger.on(ROCKETMQ_REGISTER, async (json: string) => {
        const { topic, groupId, instanceId } = JSON.parse(json);
        const key = `${ROCKETMQ_PREFIX}:${topic}:${groupId}:${instanceId}`;
        if (this.instances.find(instance => instance.key === key)) {
          return;
        }
        this.instances.push({
          key,
          consumer: this.client.getConsumer(instanceId, topic, groupId),
          status: RocketMQInstanceStatus.INITIAL,
        });
      });
      // subscribe
    });
  }
}
