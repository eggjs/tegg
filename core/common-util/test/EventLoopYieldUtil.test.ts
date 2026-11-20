import { strict as assert } from 'node:assert';
import { EventLoopYieldUtil } from '..';

describe('test/EventLoopYieldUtil.test.ts', () => {
  it('should yield to the event loop when the interval is reached', async () => {
    let yielded = false;
    setImmediate(() => {
      yielded = true;
    });

    const eventLoopYield = new EventLoopYieldUtil(0);
    const yieldTask = eventLoopYield.yieldIfNeeded();
    assert(yieldTask);
    await yieldTask;

    assert.equal(yielded, true);
  });

  it('should return synchronously before the interval is reached', () => {
    const eventLoopYield = new EventLoopYieldUtil(Number.MAX_SAFE_INTEGER);
    assert.equal(eventLoopYield.yieldIfNeeded(), undefined);
  });

  it('should reject an invalid interval', () => {
    assert.throws(() => new EventLoopYieldUtil(-1), /non-negative finite number/);
  });
});
