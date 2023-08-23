import { RuntimeConfigUtil } from '..';
import assert from 'assert';

describe('test/RuntimeConfigUtil.test.ts', () => {

  it('should work', () => {
    RuntimeConfigUtil.setRuntimeConfig({
      baseDir: '/tmp',
      env: 'prod',
      name: 'test',
    });
    assert.deepEqual(RuntimeConfigUtil.getRuntimeConfig(), {
      baseDir: '/tmp',
      env: 'prod',
      name: 'test',
    });

    RuntimeConfigUtil.setRuntimeConfig({
      name: 'test2',
    });
    assert.deepEqual(RuntimeConfigUtil.getRuntimeConfig(), {
      baseDir: '/tmp',
      env: 'prod',
      name: 'test2',
    });
  });

  it('should check', () => {
    assert.throws(() => {
      RuntimeConfigUtil.setRuntimeConfig({ baseDir: 1 as any });
    }, /The value of baseDir must be a string/);
  });

});
