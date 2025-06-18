import { Inject, LoadUnitLifecycleProto, SingletonProto } from '@eggjs/tegg';
import { LifecycleHook, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';
import { EggPrototypeCreatorFactory, EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { Foo } from './Foo';

@LoadUnitLifecycleProto()
export class FooLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  @Inject()
  foo: Foo;

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name !== 'loadUnitLifecycleApp') {
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
