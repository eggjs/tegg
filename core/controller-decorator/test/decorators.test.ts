import assert from 'node:assert';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { FooController } from './fixtures/HTTPFooController';

describe('test/decorators.test.ts', () => {
  describe('', () => {
    it('should get the right file path', () => {
      assert(PrototypeUtil.getFilePath(FooController) === FooController.fileName);
    });
  });
});
