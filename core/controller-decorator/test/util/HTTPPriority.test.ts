import { HTTPPriorityUtil } from '../../src/util/HTTPPriorityUtil';
import assert from 'assert';

describe('test/util/HTTPPriority.test.ts', () => {
  describe('path has no regexp', () => {
    it('should eqs 100000', () => {
      assert(HTTPPriorityUtil.calcPathPriority('/') === HTTPPriorityUtil.DEFAULT_PRIORITY);
      assert(HTTPPriorityUtil.calcPathPriority('/users') === HTTPPriorityUtil.DEFAULT_PRIORITY);
    });
  });

  describe('path has regexp', () => {
    describe('path has less than 10 /', () => {
      it('should works', () => {
        assert(HTTPPriorityUtil.calcPathPriority('/*') === 0);
        assert(HTTPPriorityUtil.calcPathPriority('/users/:id') === 1000);
        assert(HTTPPriorityUtil.calcPathPriority('/users/:id/moments/:momentId') === 4000);
      });
    });
  });
});
