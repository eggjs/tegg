import { Application } from 'egg';
import { RocketMQMessageListenerProtoManager } from './lib/RocketMQMessageListenerProtoManager';
import { RocketMQMessageListenerFactory } from '../../core/rocketmq-runtime/dist';
import { RocketMQMessageListenerProtoHook } from './lib/RocketMQMessageListenerProtoHook';

export default class RocketMQAppHook {
  private readonly app: Application;
  private readonly protoManager: RocketMQMessageListenerProtoManager;
  private readonly protoHook: RocketMQMessageListenerProtoHook;

  constructor(app) {
    const protoFactory = new RocketMQMessageListenerFactory(app);
    this.app = app;
    this.protoManager = new RocketMQMessageListenerProtoManager(protoFactory);
    this.protoHook = new RocketMQMessageListenerProtoHook(this.protoManager);
  }

  async configDidLoad() {
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.protoHook);
  }

  async didReady() {
    await this.protoManager.register();
  }

  async beforeClose() {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.protoHook);
  }
}
