import { strict as assert } from 'node:assert';
import { StandAloneAppTest } from './Utils';

describe('standalone/standalone/test/lifecycleProto.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should LoadUnitLifecycleProto work', async () => {
    const msg: string = await StandAloneAppTest.run('load-unit-lifecycle-proto');
    assert.equal(msg, 'dynamic bar name|foo fake name');
  });

  it('should LoadUnitInstanceLifecycleProto work', async () => {
    const count: number = await StandAloneAppTest.run('load-unit-instance-lifecycle-proto');
    assert.equal(count, 66);
  });

  it('should EggObjectLifecycleProto work', async () => {
    const msg: string = await StandAloneAppTest.run('egg-object-lifecycle-proto');
    assert.equal(msg, 'foo message from FooEggObjectHook');
  });

  it('should EggPrototypeLifecycleProto work', async () => {
    const msg: string = await StandAloneAppTest.run('egg-prototype-lifecycle-proto');
    assert.equal(msg, 'class name is Foo');
  });

  it('should EggContextLifecycleProto work', async () => {
    const msg: string = await StandAloneAppTest.run('egg-context-lifecycle-proto');
    assert.equal(msg, 'Y');
  });
});
