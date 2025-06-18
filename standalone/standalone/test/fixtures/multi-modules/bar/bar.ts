import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import { ModuleConfig } from '@eggjs/tegg/helper';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class Bar {
  @Inject()
  moduleConfig: ModuleConfig;
}
