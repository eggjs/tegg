import { ControllerInfoUtil, ControllerMetaBuilderFactory, ControllerType, EggProtoImplClass } from '@eggjs/tegg';
import { AgentControllerInfoUtil } from '../util/AgentControllerInfoUtil';
import { AgentControllerMetadata } from '../model/AgentControllerMetadata';
import assert from 'node:assert';

export class AgentControllerMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): AgentControllerMetadata | undefined {
    const metadata = AgentControllerInfoUtil.getAgentControllerMetadata(this.clazz);
    const controllerType = ControllerInfoUtil.getControllerType(this.clazz);
    const middlewares = ControllerInfoUtil.getControllerMiddlewares(
      this.clazz,
    );
    const clazzName = this.clazz.name;
    const controllerName =
      ControllerInfoUtil.getControllerName(this.clazz) || clazzName;
    assert(controllerType === ControllerType.AGENT, 'invalidate controller type');
    if (metadata) {
      return new AgentControllerMetadata(metadata, controllerName, middlewares);
    }
  }

  static create(clazz: EggProtoImplClass): AgentControllerMetaBuilder {
    return new AgentControllerMetaBuilder(clazz);
  }
}


ControllerMetaBuilderFactory.registerControllerMetaBuilder(
  ControllerType.AGENT,
  AgentControllerMetaBuilder.create,
);
