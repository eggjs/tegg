import assert from 'assert';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { EggTestContext } from './fixtures/EggTestContext';
import TestUtil from './util';
import { EggContainerFactory } from '..';
import { Foo, Bar } from './fixtures/modules/lifecycle-hook/object';

describe('test/EggObject.test.ts', () => {

  describe('lifecycle', () => {
    describe('context proto', () => {
      it('should work', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const ctx = new EggTestContext();
        const fooProto = EggPrototypeFactory.instance.getPrototype('foo');
        const fooObj = await EggContainerFactory.getOrCreateEggObject(fooProto, fooProto.name, ctx);
        const foo = fooObj.obj as Foo;
        await ctx.destroy({});
        await TestUtil.destroyLoadUnitInstance(instance);
        const called = foo.getLifecycleCalled();
        assert.deepStrictEqual(called, [
          'construct',
          'postConstruct',
          'preInject',
          'postInject',
          'init',
          'preDestroy',
          'destroy',
        ]);
      });
    });

    describe('singleton proto', () => {
      it('should work', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const ctx = new EggTestContext();
        const barProto = EggPrototypeFactory.instance.getPrototype('bar');
        const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name, ctx);
        const bar = barObj.obj as Bar;
        await TestUtil.destroyLoadUnitInstance(instance);
        const called = bar.getLifecycleCalled();
        assert.deepStrictEqual(called, [
          'construct',
          'postConstruct',
          'preInject',
          'postInject',
          'init',
          'preDestroy',
          'destroy',
        ]);
      });
    });
  });
});
