import { Inject, SingletonProto } from '@eggjs/core-decorator';
import { BizManager, BizManagerQualifier } from '../bar/BizManager';

@SingletonProto()
export class App {
  @Inject()
  @BizManagerQualifier('foo')
  bizManager: BizManager;
}
