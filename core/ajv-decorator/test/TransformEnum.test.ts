import { strict as assert } from 'node:assert';
import { TransformEnum } from '..';

describe('core/ajv-decorator/test/TransformEnum.test.ts', () => {
  it('should get TransformEnum', () => {
    assert.equal(TransformEnum.trim, 'trim');
  });
});
