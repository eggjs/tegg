import assert from 'node:assert';
import mm from 'mm';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { EggObjectUtil } from '../src/impl/EggObjectUtil';
import { ContextHandler } from '../src/model/ContextHandler';
import { EggTestContext } from './fixtures/EggTestContext';
import TestUtil from './util';

describe('test/EggObjectUtil.test.ts', () => {
  let ctx: EggTestContext;

  beforeEach(() => {
    ctx = new EggTestContext();
    mm(ContextHandler, 'getContext', () => {
      return ctx;
    });
  });

  it('should name should has self descriptor', async () => {
    const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
    const fooProto = EggPrototypeFactory.instance.getPrototype('foo');
    const fooDesc = EggObjectUtil.contextEggObjectGetProperty(fooProto, 'foo');
    const barDesc = EggObjectUtil.contextEggObjectGetProperty(fooProto, 'bar');
    assert(fooDesc !== barDesc);
    await TestUtil.destroyLoadUnitInstance(instance);
  });
});
