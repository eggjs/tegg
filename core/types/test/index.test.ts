import snapshot from 'snap-shot-it';
import * as types from '..';

describe('test/index.test.ts', () => {
  it('should export stable', async () => {
    snapshot(types);
  });
});
