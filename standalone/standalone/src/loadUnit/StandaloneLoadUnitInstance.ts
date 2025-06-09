import { EggLifecycleInfo, PrototypeUtil } from '@eggjs/core-decorator';
import { EggPrototypeLifecycleUtil, LoadUnitLifecycleUtil } from '@eggjs/tegg-metadata';
import {
  EggContextLifecycleUtil,
  EggObjectLifecycleUtil,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
  type LoadUnitInstanceLifecycleContext,
  LoadUnitInstanceLifecycleUtil,
  ModuleLoadUnitInstance,
} from '@eggjs/tegg-runtime';
import { StandaloneLoadUnitType } from '../common/constant';
import { LifecycleUtil } from '@eggjs/tegg-lifecycle';

export class StandaloneLoadUnitInstance extends ModuleLoadUnitInstance {
  static LifecycleUtils: Record<string, LifecycleUtil<any, any>> = {
    LoadUnit: LoadUnitLifecycleUtil,
    LoadUnitInstance: LoadUnitInstanceLifecycleUtil,
    EggPrototype: EggPrototypeLifecycleUtil,
    EggObject: EggObjectLifecycleUtil,
    EggContext: EggContextLifecycleUtil,
  };

  readonly #lifecycleObjects: [string, object][] = [];

  async init(ctx: LoadUnitInstanceLifecycleContext): Promise<void> {
    await super.init(ctx);

    for (const [ name, proto ] of this.iterateProtoToCreate()) {
      const isLifecycleProto = proto.getMetaData<boolean>(PrototypeUtil.IS_EGG_LIFECYCLE_PROTOTYPE);
      const lifecycleInfo = proto.getMetaData<EggLifecycleInfo>(PrototypeUtil.EGG_LIFECYCLE_PROTOTYPE_METADATA);
      if (isLifecycleProto && lifecycleInfo?.type) {
        const lifecycle = this.getEggObject(name, proto).obj;
        const lifecycleUtil = StandaloneLoadUnitInstance.LifecycleUtils[lifecycleInfo.type];
        if (!lifecycleUtil) {
          throw new Error(`register lifecycle failed, unknown type ${lifecycleInfo.type}`);
        }
        lifecycleUtil.registerLifecycle(lifecycle);
        this.#lifecycleObjects.push([ lifecycleInfo.type, lifecycle ]);
      }
    }
  }

  async destroy(): Promise<void> {
    let toBeDeleted = this.#lifecycleObjects.shift();
    while (toBeDeleted) {
      const [ type, lifecycle ] = toBeDeleted;
      StandaloneLoadUnitInstance.LifecycleUtils[type]?.deleteLifecycle(lifecycle);
      toBeDeleted = this.#lifecycleObjects.shift();
    }

    await super.destroy();
  }

  static createStandaloneLoadUnitInstance(ctx: LoadUnitInstanceLifecycleContext): LoadUnitInstance {
    return new StandaloneLoadUnitInstance(ctx.loadUnit);
  }
}

LoadUnitInstanceFactory.registerLoadUnitInstanceClass(StandaloneLoadUnitType, StandaloneLoadUnitInstance.createStandaloneLoadUnitInstance);
