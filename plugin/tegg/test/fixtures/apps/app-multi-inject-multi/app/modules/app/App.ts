import { Inject, SingletonProto } from '@eggjs/tegg';

import type { BizManager} from '../bar/BizManager.ts';
import { BizManagerQualifier } from '../bar/BizManager.ts';

@SingletonProto()
export class App {
  @Inject()
  @BizManagerQualifier('foo')
  bizManager: BizManager;
}
