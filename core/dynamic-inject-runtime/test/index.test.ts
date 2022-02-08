import path from 'path';
import { LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { LoadUnitFactory } from '@eggjs/tegg-metadata';
import { EggTestContext } from '../../test-util';
import { HelloService } from './fixtures/modules/dynamic-inject-module/HelloService';
import { CoreTestHelper } from '../../test-util/CoreTestHelper';
import assert from 'assert';

describe('test/dynamic-inject-runtime.test.ts', () => {
  let modules: Array<LoadUnitInstance>;
  beforeEach(async () => {
    modules = await CoreTestHelper.prepareModules([
      path.join(__dirname, '..'),
      path.join(__dirname, 'fixtures/modules/dynamic-inject-module'),
    ]);
  });

  afterEach(async () => {
    for (const module of modules) {
      await LoadUnitFactory.destroyLoadUnit(module.loadUnit);
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(module);
    }
  });

  it('should work', async () => {
    const ctx = new EggTestContext();
    const helloService = await CoreTestHelper.getObject(HelloService, ctx);
    const msgs = await helloService.hello();
    assert.deepStrictEqual(msgs, [
      'hello, foo(context:0)',
      'hello, bar(context:0)',
      'hello, foo(singleton:0)',
      'hello, bar(singleton:0)',
    ]);

    const ctx2 = new EggTestContext();
    const helloService2 = await CoreTestHelper.getObject(HelloService, ctx2);
    const msgs2 = await helloService2.hello();
    assert.deepStrictEqual(msgs2, [
      'hello, foo(context:0)',
      'hello, bar(context:0)',
      // singleton use the same object
      // counter should has cache
      'hello, foo(singleton:1)',
      'hello, bar(singleton:1)',
    ]);
  });
});
