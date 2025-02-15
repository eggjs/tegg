import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { NameUtil } from '..';

describe('test/NameUtil.test.ts', () => {
  it('should work', () => {
    class Hello {}
    const name = NameUtil.getClassName(Hello);
    assert(name === 'hello');
  });
});
