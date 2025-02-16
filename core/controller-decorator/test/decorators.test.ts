import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { FooController } from './fixtures/HTTPFooController.js';

describe('test/decorators.test.ts', () => {
  describe('', () => {
    it('should get the right file path', () => {
      assert.equal(PrototypeUtil.getFilePath(FooController), FooController.fileName);
    });
  });
});
