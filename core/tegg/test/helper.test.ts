import assert from 'node:assert/strict';
import { it } from 'vitest';
import {
  AbstractEggContext,
  LoadUnitInstanceLifecycleUtil,
  LoaderUtil,
  ModuleConfigUtil,
  LoadUnitLifecycleUtil,
} from '../helper.js';

it('should helper exports work', async () => {
  assert(AbstractEggContext);
  assert(LoadUnitInstanceLifecycleUtil);
  assert(LoaderUtil);
  assert(ModuleConfigUtil);
  assert(LoadUnitLifecycleUtil);
});
