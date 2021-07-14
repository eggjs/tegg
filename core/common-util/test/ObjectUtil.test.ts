import assert from 'assert';
import { ObjectUtils } from '..';

describe('test/ObjectUtil.test.ts', () => {
  it('should work', () => {
    function mockFunction(/* test */ctx: object, foo: string, bar = '233') {
      // test
      console.log(ctx, foo, bar);
    }

    const argNames = ObjectUtils.getFunctionArgNameList(mockFunction);
    assert.deepStrictEqual(argNames, [ 'ctx', 'foo', 'bar' ]);
  });
});
