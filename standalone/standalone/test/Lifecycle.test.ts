import { strict as assert } from 'node:assert';
import { StandAloneAppTest } from './Utils';

describe('standalone/standalone/test/Lifecycle.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should object lifecycle work', async () => {
    const res = await StandAloneAppTest.run<string[]>('lifecycle');
    assert.deepEqual(res, [
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
