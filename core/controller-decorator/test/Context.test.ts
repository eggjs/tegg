import assert from 'node:assert';
import { ContextController } from './fixtures/ContextController';
import MethodInfoUtil from '../src/util/MethodInfoUtil';

describe('test/Context.test.ts', () => {
  it('should work', () => {
    const contextIndex = MethodInfoUtil.getMethodContextIndex(ContextController, 'hello');
    assert(contextIndex === 0);
  });
});
