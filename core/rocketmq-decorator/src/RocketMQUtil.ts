import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { RocketMQMetadata } from './RocketMQMetadata';

export const ROCKET_MQ_PROPERTY = Symbol.for('EggPrototype#rocketMQMessagelistener');

export const TEGG_ROCKETMQ_REG = '$tegg:rocketmq:reg';
export const TEGG_ROCKETMQ_SYN_PREFIX = '$tegg:rocketmq:syn:';
export const TEGG_ROCKETMQ_ACK_PREFIX = '$tegg:rocketmq:ack:';
export const TEGG_ROCKETMQ_UNACK_PREFIX = '$tegg:rocketmq:unack:';
export const TEGG_ROCKETMQ_UNFIN_PREFIX = '$tegg:rocketmq:unfin:';


export type RocketMQMessageListenerName = string | Symbol;

export interface RocketMQMessageListenerHandler {
  handle: (data: any) => Promise<void>;
}

export class RocketMQUtil {
  static setProperty(property: RocketMQMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(ROCKET_MQ_PROPERTY, property, clazz);
  }

  static getMessageListenerName(clazz: EggProtoImplClass): RocketMQMetadata | undefined {
    return MetadataUtil.getMetaData(ROCKET_MQ_PROPERTY, clazz);
  }
}
