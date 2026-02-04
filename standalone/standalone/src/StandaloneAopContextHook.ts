import type { EggContext, EggContextLifecycleContext, LoadUnitInstance } from '@eggjs/tegg-runtime';
import type { EggProtoImplClass, LifecycleHook } from '@eggjs/tegg';
import { PrototypeUtil, ObjectInitType } from '@eggjs/tegg';
import { AspectInfoUtil } from '@eggjs/tegg/aop';
import { EggPrototype, TeggError } from '@eggjs/tegg-metadata';

export interface EggPrototypeWithClazz extends EggPrototype {
  clazz?: EggProtoImplClass;
}

export interface ProtoToCreate {
  name: string;
  proto: EggPrototype;
}

/**
 * AopContextHook for standalone mode.
 * Pre-creates ContextProto advice objects when a new context is initialized.
 * This ensures that advice objects are available when AOP methods are called.
 */
export class StandaloneAopContextHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  private requestProtoList: Array<ProtoToCreate> = [];

  constructor(loadUnitInstances: LoadUnitInstance[]) {
    for (const loadUnitInstance of loadUnitInstances) {
      const iterator = loadUnitInstance.loadUnit.iterateEggPrototype();
      for (const proto of iterator) {
        const protoWithClazz = proto as EggPrototypeWithClazz;
        const clazz = protoWithClazz.clazz;
        if (!clazz) continue;
        const aspects = AspectInfoUtil.getAspectList(clazz);
        for (const aspect of aspects) {
          for (const advice of aspect.adviceList) {
            const adviceProto = PrototypeUtil.getClazzProto(advice.clazz) as EggPrototype | undefined;
            if (!adviceProto) {
              throw TeggError.create(`Aop Advice(${advice.clazz.name}) not found in loadUnits`, 'advice_not_found');
            }
            if (adviceProto.initType === ObjectInitType.CONTEXT) {
              this.requestProtoList.push({
                name: advice.name,
                proto: adviceProto,
              });
            }
          }
        }
      }
    }
  }

  async preCreate(_: EggContextLifecycleContext, ctx: EggContext): Promise<void> {
    for (const proto of this.requestProtoList) {
      ctx.addProtoToCreate(proto.name, proto.proto);
    }
  }
}
