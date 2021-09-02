import { LifecycleHook } from '@eggjs/tegg';
import { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import { RocketMQMetadata, ROCKET_MQ_PROPERTY } from '@eggjs/tegg-rocketmq-decorator';
import { RocketMQMessageListenerProtoManager } from './RocketMQMessageListenerProtoManager';

export class RocketMQMessageListenerProtoHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private manager: RocketMQMessageListenerProtoManager;

  constructor(manager: RocketMQMessageListenerProtoManager) {
    this.manager = manager;
  }

  async postCreate(_ctx: EggPrototypeLifecycleContext, proto: EggPrototype): Promise<void> {
    const rocketMQProperty = proto.getMetaData(ROCKET_MQ_PROPERTY) as RocketMQMetadata;

    if (!rocketMQProperty) {
      return;
    }

    this.manager.addProto(proto);
  }
}
