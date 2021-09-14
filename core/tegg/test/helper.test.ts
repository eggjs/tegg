import assert = require('assert');
import {
  AbstractEggContext,
  LoadUnitInstanceLifecycleUtil,
  LoaderUtil,
  ModuleConfigUtil,
  LoadUnitLifecycleUtil,
} from '../helper';

describe('test/helper.test.ts', () => {
  it('should ok', async () => {
    assert(AbstractEggContext);
    assert(LoadUnitInstanceLifecycleUtil);
    assert(LoaderUtil);
    assert(ModuleConfigUtil);
    assert(LoadUnitLifecycleUtil);
  });
});
