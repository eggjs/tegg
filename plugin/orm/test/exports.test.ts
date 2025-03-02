import assert from 'node:assert/strict';

import { Orm, LeoricRegister } from '../index.js';

describe('plugin/orm/exports.test.ts', () => {
  it('should export Orm', () => {
    assert.ok(Orm);
    assert.ok(LeoricRegister);
  });
});
