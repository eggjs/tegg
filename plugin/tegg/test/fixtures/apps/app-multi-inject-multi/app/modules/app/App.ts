import { Inject, SingletonProto } from '@eggjs/core-decorator';

import { BizManager, BizManagerQualifier } from '../bar/BizManager.ts';

@SingletonProto()
export class App {
  @Inject()
  @BizManagerQualifier('foo')
  bizManager: BizManager;
}
