import { LoadUnitFactory } from '@eggjs/tegg-metadata';
import { EggContext } from '../model/EggContext';
import { EggObject } from '../model/EggObject';
import { ContextObjectGraph } from './ContextObjectGraph';
import { EggContainerFactory } from '../factory/EggContainerFactory';

const CONTEXT_INITIATOR = Symbol('EggContext#ContextInitiator');

export class ContextInitiator {
  private readonly eggContext: EggContext;
  private readonly eggObjectInitRecorder: WeakMap<EggObject, boolean>;

  constructor(eggContext: EggContext) {
    this.eggContext = eggContext;
    this.eggObjectInitRecorder = new WeakMap();
    this.eggContext.set(CONTEXT_INITIATOR, this);
  }

  async init(obj: EggObject) {
    if (this.eggObjectInitRecorder.get(obj) === true) {
      return;
    }
    this.eggObjectInitRecorder.set(obj, true);
    const injectObjectProtos = ContextObjectGraph.getContextProto(obj.proto);
    await Promise.all(injectObjectProtos.map(async injectObject => {
      const proto = injectObject.proto;
      const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
      if (!loadUnit) {
        throw new Error(`can not find load unit: ${proto.loadUnitId}`);
      }
      await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
    }));
  }

  static createContextInitiator(context: EggContext): ContextInitiator {
    let initiator = context.get(CONTEXT_INITIATOR);
    if (!initiator) {
      initiator = new ContextInitiator(context);
      context.set(CONTEXT_INITIATOR, initiator);
    }
    return initiator;
  }
}
