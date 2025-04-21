import { strict as assert } from 'node:assert';
import { TimerUtil } from '..';

describe('test/TimerUtil.test.ts', () => {
  it('should sleep work', async () => {
    const start = Date.now();
    await TimerUtil.sleep(3);
    const use = Date.now() - start;
    assert(use > 1, `use time ${use}ms`);
  });

  describe('timeout', () => {
    const fixture = Symbol.for('timeout#res');
    const delay = (ms: number) => () => new Promise(resolve => setTimeout(() => resolve(fixture), ms));

    it('should work without ms', async () => {
      const res = await TimerUtil.timeout(delay(50));
      assert.equal(res, fixture);
    });

    it('should work with ms', async () => {
      const res = await TimerUtil.timeout(delay(50), 100);
      assert.equal(res, fixture);
    });

    it('should timeout', async () => {
      await assert.rejects(TimerUtil.timeout(delay(100), 50), (e: any) => {
        return e instanceof TimerUtil.TimeoutError && e.message === 'timeout';
      });
    });

    it('should throw error', async () => {
      const e = new Error('test');
      await assert.rejects(TimerUtil.timeout(async () => { throw e; }, 100), (err: any) => err === e);
    });
  });
});
