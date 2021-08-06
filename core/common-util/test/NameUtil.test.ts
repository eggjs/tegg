import { NameUtil } from '..';
import assert from 'assert';

describe('test/NameUtil.test.ts', () => {
  it('should work', () => {
    class Hello {}
    const name = NameUtil.getClassName(Hello);
    assert(name === 'hello');
  });
});
