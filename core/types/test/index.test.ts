import { expect, it } from 'vitest'
import * as types from '../index.js';

it('should export stable', async () => {
  expect(types).toMatchSnapshot();
});
