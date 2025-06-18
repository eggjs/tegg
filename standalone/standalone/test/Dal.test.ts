import { strict as assert } from 'node:assert';
import { StandAloneAppTest } from './Utils';
import { Foo } from './fixtures/dal-module/src/Foo';

describe('standalone/standalone/test/Dal.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should work', async () => {
    const foo = await StandAloneAppTest.run<Foo>('dal-module', 'unittest');
    assert.equal(foo.col1, '2333');
  });

  it('should transaction work', async () => {
    const foo = await StandAloneAppTest.run<Array<Array<Foo>>>('dal-transaction-module', 'unittest');
    // insert_succeed_transaction_1
    assert.equal(foo[0].length, 1);
    // insert_succeed_transaction_2
    assert.equal(foo[1].length, 1);
    // insert_failed_transaction_1
    assert.equal(foo[2].length, 0);
    // insert_failed_transaction_2
    assert.equal(foo[3].length, 0);
  });
});
