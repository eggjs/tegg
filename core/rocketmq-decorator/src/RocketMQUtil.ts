import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { RocketMQMetadata } from './RocketMQMetadata';

export const ROCKET_MQ_PROPERTY = Symbol.for('EggPrototype#rocketMQMessagelistener');

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
