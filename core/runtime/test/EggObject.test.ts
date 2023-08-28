import assert from 'assert';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { EggTestContext } from './fixtures/EggTestContext';
import TestUtil from './util';
import { EggContainerFactory } from '..';
import { Foo, Bar } from './fixtures/modules/lifecycle-hook/object';
import { Bar as ExtendsBar } from './fixtures/modules/extends-module/Base';
import mm from 'mm';
import { ContextHandler } from '../src/model/ContextHandler';
import { SingletonBar } from './fixtures/modules/inject-context-to-singleton/object';

describe('test/EggObject.test.ts', () => {
  let ctx: EggTestContext;

  beforeEach(() => {
    ctx = new EggTestContext();
  });

  afterEach(() => {
    mm.restore();
  });

  describe('lifecycle', () => {
    beforeEach(() => {
      mm(ContextHandler, 'getContext', () => {
        return ctx;
      });
    });

    describe('context proto', () => {
      it('should work', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const fooProto = EggPrototypeFactory.instance.getPrototype('foo');
        const fooObj = await EggContainerFactory.getOrCreateEggObject(fooProto, fooProto.name);
        const foo = fooObj.obj as Foo;
        await TestUtil.destroyLoadUnitInstance(instance);
        const called = foo.getLifecycleCalled();
        await ctx.destroy({});
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

      it('should clear eggObjectMap/eggObjectPromiseMap/contextData after destroy', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const fooProto = EggPrototypeFactory.instance.getPrototype('foo');
        const fooObj = await EggContainerFactory.getOrCreateEggObject(fooProto, fooProto.name);
        assert(fooObj.obj);
        await ctx.destroy({});
        await TestUtil.destroyLoadUnitInstance(instance);

        // should clear all maps
        const assertCtx = ctx as any;
        assert(!assertCtx.eggObjectMap.size);
        assert(!assertCtx.eggObjectPromiseMap.size);
        assert(!assertCtx.contextData.size);
      });
    });

    describe('singleton proto', () => {
      it('should work', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const barProto = EggPrototypeFactory.instance.getPrototype('bar');
        const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
        const bar = barObj.obj as Bar;
        // get obj from class
        const barObj2 = await EggContainerFactory.getOrCreateEggObjectFromClazz((barProto as any).clazz, barProto.name);
        assert.equal(barObj2, barObj);
        assert.equal(barObj2.obj, barObj.obj);

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

  describe('inject context to singleton', () => {
    it('should work', async () => {
      mm(ContextHandler, 'getContext', () => {
        return;
      });
      const instance = await TestUtil.createLoadUnitInstance('inject-context-to-singleton');
      const barProto = EggPrototypeFactory.instance.getPrototype('singletonBar');
      mm(ContextHandler, 'getContext', () => {
        return ctx;
      });
      const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
      const bar = barObj.obj as SingletonBar;
      const msg = await bar.hello();
      assert(msg === 'hello from depth2');
      await TestUtil.destroyLoadUnitInstance(instance);
      await ctx.destroy({});
    });
  });

  describe('property mock', () => {
    beforeEach(() => {
      mm(ContextHandler, 'getContext', () => {
        return ctx;
      });
    });

    it('should work', async () => {
      const instance = await TestUtil.createLoadUnitInstance('extends-module');
      const barProto = EggPrototypeFactory.instance.getPrototype('bar', instance.loadUnit);
      const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
      const bar = barObj.obj as ExtendsBar;
      const foo = {};
      mm(bar, 'foo', foo);
      assert(bar.foo === foo);

      await TestUtil.destroyLoadUnitInstance(instance);
      await ctx.destroy({});
    });
  });
});
