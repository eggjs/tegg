import assert from 'node:assert';
import mm from 'mm';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import TestUtil from './util';
import { EggTestContext } from './fixtures/EggTestContext';
import CacheService from './fixtures/modules/init-type-qualifier-module/CacheService';
import { EggContainerFactory } from '..';
import { ContextHandler } from '../src/model/ContextHandler';

describe('test/LoadUnit/QualifierLoadUnitInstance.test.ts', () => {
  let ctx: EggTestContext;

  beforeEach(() => {
    ctx = new EggTestContext();
    mm(ContextHandler, 'getContext', () => {
      return ctx;
    });
  });

  afterEach(async () => {
    await ctx.destroy({});
    mm.restore();
  });

  describe('init type qualifier', () => {
    it('should work', async () => {
      const instance = await TestUtil.createLoadUnitInstance('init-type-qualifier-module');
      const cacheServiceProto = EggPrototypeFactory.instance.getPrototype('cacheService', instance.loadUnit);
      const cacheServiceObj = await EggContainerFactory.getOrCreateEggObject(cacheServiceProto, cacheServiceProto.name);
      const cacheService = cacheServiceObj.obj as CacheService;
      cacheService.setContextCache('cacheKey', 'cacheVal');
      cacheService.setSingletonCache('cacheKey', 'cacheVal');
      const contextCache = cacheService.getContextCache('cacheKey');
      assert.deepStrictEqual(contextCache, {
        val: 'cacheVal',
        from: 'context',
      });
      const singletonCache = cacheService.getSingletonCache('cacheKey');
      assert.deepStrictEqual(singletonCache, {
        val: 'cacheVal',
        from: 'singleton',
      });

      await TestUtil.destroyLoadUnitInstance(instance);
    });
  });
});
