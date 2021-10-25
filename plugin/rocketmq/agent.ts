import { Application } from 'egg';
import { TEGG_ROCKETMQ_REG } from '@eggjs/tegg-rocketmq-decorator';
import { RocketMQClient } from './lib/RocketMQClient';

export default class RocketMQAgentHook {
  private readonly agent: Application;
  private readonly client: RocketMQClient;

  constructor(agent: Application) {
    this.agent = agent;
    this.client = new RocketMQClient(agent);
  }

  async willReady() {
    // register
    this.agent.messenger.on(TEGG_ROCKETMQ_REG, async (json: string) => {
      this.client.addMessageHandler(json);
    });
  }
  async serverDidReady() {
    // start to listen
    this.client.listen();
  }
}
