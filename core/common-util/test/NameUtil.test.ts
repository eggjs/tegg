import assert from 'node:assert';
import { NameUtil } from '..';

describe('test/NameUtil.test.ts', () => {
  it('should work', () => {
    class Hello {}
    const name = NameUtil.getClassName(Hello);
    assert(name === 'hello');
  });
});
