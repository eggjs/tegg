import { strict as assert } from 'node:assert';
import path from 'node:path';
import { StandAloneAppTest } from './Utils';
import { EggPrototypeNotFound } from '@eggjs/tegg-metadata';

describe('standalone/standalone/test/Inject.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should optional work', async () => {
    const nil = await StandAloneAppTest.run<boolean>('optional-inject');
    assert.equal(nil, true);
  });

  it('should throw error if no proto found', async () => {
    await assert.rejects(
      StandAloneAppTest.run('invalid-inject'),
      (e: any) =>
        e instanceof EggPrototypeNotFound
        && /Object doesNotExist not found in LOAD_UNIT:invalidInject/.test(e.message),
    );
  });

  describe('dynamic inject', () => {
    it('should work', async () => {
      const msg = await StandAloneAppTest.run<string[]>('dynamic-inject-module', {
        frameworkDeps: [
          { baseDir: path.join(__dirname, '..'), extraFilePattern: [ '!**/test' ] },
        ],
      });
      assert.deepEqual(msg, [
        'hello, foo(context:0)',
        'hello, bar(context:0)',
        'hello, foo(singleton:0)',
        'hello, bar(singleton:0)',
      ]);
    });
  });
});
