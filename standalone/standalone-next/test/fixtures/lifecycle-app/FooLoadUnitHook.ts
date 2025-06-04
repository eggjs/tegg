import { Inject, LoadUnitLifecycleProto } from '@eggjs/tegg';
import { LifecycleHook, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';
import { Foo } from './Foo';
import { SingletonProto } from '@eggjs/tegg';
import { EggPrototypeCreatorFactory, EggPrototypeFactory } from '@eggjs/tegg-metadata';

@LoadUnitLifecycleProto()
export class LoadUnitControllerHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  @Inject()
  foo: Foo;

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name !== 'lifecycleApp') {
      return;
    }
    const fooName = this.foo.getName();
    class DynamicBar {
      getName() {
        return 'dynamic bar name|' + fooName;
      }
    }
    SingletonProto()(DynamicBar);
    const protos = await EggPrototypeCreatorFactory.createProto(DynamicBar, loadUnit);
    for (const proto of protos) {
      EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
    }
  }
}
