import { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ObjectInitType, LifecycleHook } from '@eggjs/tegg';
import { ControllerLoadUnitHandler } from './ControllerLoadUnitHandler';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export class EggControllerHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  private readonly controllerLoadUnitHandler: ControllerLoadUnitHandler;
  private requestProtoList: Array<EggPrototype> = [];

  constructor(controllerLoadUnitHandler: ControllerLoadUnitHandler) {
    this.controllerLoadUnitHandler = controllerLoadUnitHandler;
    const iterator = this.controllerLoadUnitHandler.controllerLoadUnit.iterateEggPrototype();
    for (const proto of iterator) {
      if (proto.initType === ObjectInitType.CONTEXT) {
        this.requestProtoList.push(proto);
      }
    }
  }

  async preCreate(_, ctx: EggContext): Promise<void> {
    const rootProto = ctx.get(ROOT_PROTO);
    if (rootProto) {
      const proto: EggPrototype = rootProto;
      ctx.addProtoToCreate(proto.name, proto);
    } else {
      for (const proto of this.requestProtoList) {
        ctx.addProtoToCreate(proto.name, proto);
      }
    }
  }
}
