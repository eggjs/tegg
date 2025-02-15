import snapshot from 'snap-shot-it';
import * as types from '../src/index.js';

describe('test/index.test.ts', () => {
  it('should export stable', async () => {
    snapshot(types);
  });
});
