import assert from 'node:assert';
import { mm } from 'mm';
import { describe, beforeEach, it } from 'vitest';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { EggObjectUtil, ContextHandler } from '../src/index.js';
import { EggTestContext } from './fixtures/EggTestContext.js';
import TestUtil from './util.js';

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
    assert.notEqual(fooDesc, barDesc);
    await TestUtil.destroyLoadUnitInstance(instance);
  });
});
