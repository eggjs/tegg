import { strict as assert } from 'node:assert';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { StandAloneAppTest } from './Utils';
import { CustomEvent } from './fixtures/simple/Event';

describe('standalone/service-worker-runtime/test/index.test.ts', () => {
  describe('simple', () => {
    before(async function() {
      if (StandaloneTestUtil.skipOnNode()) {
        return this.skip();
      }
    });

    it('should work', async () => {
      const event = new CustomEvent('custom', { foo: 'bar' });
      const msg = await StandAloneAppTest.run<string>('simple', event);

      assert(msg, 'hello:{"foo":"bar"}');
    });
  });
});
