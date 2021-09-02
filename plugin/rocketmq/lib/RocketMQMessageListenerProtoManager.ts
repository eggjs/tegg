import { EggPrototype } from '@eggjs/tegg-metadata';
import { RocketMQMetadata, ROCKET_MQ_PROPERTY } from '@eggjs/tegg-rocketmq-decorator';
import { RocketMQMessageListenerFactory } from '@eggjs/tegg-rocketmq-runtime';

export interface RocketMQMessageListenerAdapter {
  subscribe(): Promise<void>;
}

export class RocketMQMessageListenerProtoManager {
  private readonly protos: Set<EggPrototype> = new Set();
  private readonly factory: RocketMQMessageListenerFactory;

  constructor(factory: RocketMQMessageListenerFactory) {
    this.factory = factory;
  }

  addProto(proto: EggPrototype) {
    this.protos.add(proto);
  }

  async register() {
    for (const proto of this.protos) {
      const property = proto.getMetaData(ROCKET_MQ_PROPERTY) as RocketMQMetadata;

      if (!property) {
        return;
      }

      const instance = this.factory.createInstance(proto, property);

      instance.subscribe();
    }
  }

  getProtos() {
    return Array.from(this.protos);
  }
}
