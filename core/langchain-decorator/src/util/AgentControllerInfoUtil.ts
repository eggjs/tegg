import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

import { AGENT_CONTROLLER_METADATA } from '../type/metadataKey';
import type { IAgentControllerMetadata } from '../model/AgentControllerMetadata';

export class AgentControllerInfoUtil {
  static setAgentControllerMetadata(metadata: IAgentControllerMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(AGENT_CONTROLLER_METADATA, metadata, clazz);
  }

  static getAgentControllerMetadata(clazz: EggProtoImplClass): IAgentControllerMetadata | undefined {
    return MetadataUtil.getMetaData(AGENT_CONTROLLER_METADATA, clazz);
  }
}
