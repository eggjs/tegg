import snapshot from 'snap-shot-it';
import * as types from '../index.js';

describe('plugin/orm/exports.test.ts', () => {
  it('should export Orm', () => {
    snapshot(Object.keys(types));
  });
});
