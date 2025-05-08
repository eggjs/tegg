import { SqlUtil } from '../src/SqlUtil';
import assert from 'assert';

it('should preserve SQL hint and remove normal comments', () => {
  const sql = 'SELECT /*+ INDEX(a) */ * FROM table /* this is a comment */ WHERE id = 1';
  const result = SqlUtil.minify(sql);
  assert.strictEqual(result, 'SELECT /*+ INDEX(a) */ * FROM table WHERE id = 1');
}); 