import assert = require('assert');
import {
  AbstractEggContext,
  LoadUnitInstanceLifecycleUtil,
  LoaderUtil,
  ModuleConfigUtil,
  LoadUnitLifecycleUtil,
  testUtil,
} from '../helper';

describe('test/helper.test.ts', () => {
  it('should ok', async () => {
    assert(AbstractEggContext);
    assert(LoadUnitInstanceLifecycleUtil);
    assert(LoaderUtil);
    assert(ModuleConfigUtil);
    assert(LoadUnitLifecycleUtil);
    assert(testUtil.LoaderUtil);
    assert(testUtil.TestLoader);
  });
});