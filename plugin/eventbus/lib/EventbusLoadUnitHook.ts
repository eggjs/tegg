import { LifecycleHook } from '@eggjs/tegg';
import {
  EggLoadUnitType,
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  LoadUnit,
  LoadUnitLifecycleContext,
} from '@eggjs/tegg-metadata';
import { EventContextFactory, EventHandlerFactory, SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';

const REGISTER_CLAZZ = [
  EventHandlerFactory,
  EventContextFactory,
  SingletonEventBus,
];

export class EventbusLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async postCreate(_ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.type === EggLoadUnitType.APP) {
      for (const clazz of REGISTER_CLAZZ) {
        const proto = await EggPrototypeCreatorFactory.createProto(clazz, loadUnit);
        EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
      }
    }
  }
}
