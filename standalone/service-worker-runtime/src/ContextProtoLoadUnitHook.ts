import assert from 'node:assert';
import { IdenticalUtil, LifecycleHook } from '@eggjs/tegg-lifecycle';
import { ContextHandler, EggPrototypeFactory, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg/helper';
import { StandaloneInnerObjectProto } from '@eggjs/tegg-standalone-next';
import { ObjectInitType } from '@eggjs/tegg-types';
import { LoadUnitLifecycleProto } from '@eggjs/tegg';
import { ProtoMeta } from './types';
import { ContextProtoProperty } from './constants';

@LoadUnitLifecycleProto()
export class ContextProtoLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name === 'serviceWorkerRuntime') {
      // can `@Inject() event`
      ContextProtoLoadUnitHook.registerPrototype(ContextProtoProperty.Event, loadUnit);
    }
  }

  static registerPrototype(protoMeta: ProtoMeta, loadUnit: LoadUnit) {
    const proto = new StandaloneInnerObjectProto(
      IdenticalUtil.createProtoId(loadUnit.id, protoMeta.protoName),
      protoMeta.protoName,
      (() => {
        const ctx = ContextHandler.getContext();
        assert(ctx, 'context should not be null');
        return ctx.get(protoMeta.contextKey);
      }) as any,
      ObjectInitType.CONTEXT,
      loadUnit.id,
      [],
    );
    EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
  }
}
