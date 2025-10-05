import { Inject, SingletonProto } from '@eggjs/core-decorator';
import type { BizManager} from '../bar/BizManager.js';
import { BizManagerQualifier } from '../bar/BizManager.js';

@SingletonProto()
export class App {
  @Inject()
  @BizManagerQualifier('foo')
  bizManager: BizManager;
}
