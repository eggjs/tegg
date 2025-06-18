import { strict as assert } from 'node:assert';
import path from 'node:path';
import { StandAloneAppTest } from './Utils';

describe('standalone/standalone/test/aop.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should work', async () => {
    const msg = await StandAloneAppTest.run('aop-module');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { crosscutAdviceParams, pointcutAdviceParams } = require(path.join(StandAloneAppTest.baseDir('aop-module'), 'Hello'));
    assert.deepEqual(msg,
      'withCrossAroundResult(' +
      'withPointAroundResult(' +
      `hello withPointAroundParam(withCrosscutAroundParam(aop))${JSON.stringify(pointcutAdviceParams)}` +
      ')' +
      `${JSON.stringify(crosscutAdviceParams)}` +
      ')',
    );
  });
});
