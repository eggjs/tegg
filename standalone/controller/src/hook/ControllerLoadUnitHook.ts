import { LifecycleHook, LifecyclePostInject } from '@eggjs/tegg-lifecycle';
import { EggPrototype, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg/helper';
import { CONTROLLER_META_DATA, ControllerMetadata, ControllerType, Inject, LoadUnitLifecycleProto } from '@eggjs/tegg';
import { ControllerRegisterFactory } from '../ControllerRegisterFactory';
import { RootProtoManager } from '../RootProtoManager';
import { ControllerMetadataManager } from '../ControllerMetadataManager';
import { FetchRouter } from '../impl/http/FetchRouter';
import { HTTPControllerRegister } from '../impl/http/HTTPControllerRegister';

@LoadUnitLifecycleProto()
export class ControllerLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  @Inject()
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  @Inject()
  private readonly rootProtoManager: RootProtoManager;
  @Inject()
  private readonly controllerMetadataManager: ControllerMetadataManager;
  @Inject()
  private readonly fetchRouter: FetchRouter;

  @LifecyclePostInject()
  registerControllerRegister() {
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.HTTP, (proto: EggPrototype, controllerMeta: ControllerMetadata) => {
      return HTTPControllerRegister.create(proto, controllerMeta, this.fetchRouter);
    });
  }

  async postCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const iterator = loadUnit.iterateEggPrototype();
    for (const proto of iterator) {
      const metadata: ControllerMetadata | undefined = proto.getMetaData(CONTROLLER_META_DATA);
      if (!metadata) {
        continue;
      }
      const register = this.controllerRegisterFactory.getControllerRegister(proto, metadata);
      if (!register) {
        throw new Error(`not find controller implement for ${String(proto.name)} which type is ${metadata.type}`);
      }
      this.controllerMetadataManager.addController(metadata);
      await register.register(this.rootProtoManager);
    }
  }
}
