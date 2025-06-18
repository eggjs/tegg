import { strict as assert } from 'node:assert';
import { StandAloneAppTest } from './Utils';
import { EggPrototypeNotFound } from '@eggjs/tegg-metadata';

describe('standalone/standalone/test/InnerObjectProto.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should throw error if inject innerObject by default', async () => {
    await assert.rejects(
      StandAloneAppTest.run('invalid-inner-object-inject'),
      (e: any) =>
        e instanceof EggPrototypeNotFound
        && /Object innerBar not found in LOAD_UNIT:invalidInnerObjectInject/.test(e.message),
    );
  });

  it('should inject innerObject work when accessLevel is public', async () => {
    const message = await StandAloneAppTest.run<string>('inner-object-proto');
    assert.equal(message, 'with inner bar and inner foo');
  });
});
