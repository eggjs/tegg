import { AccessLevel, Inject, ModuleConfig, ModuleQualifier, SingletonProto } from '@eggjs/tegg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class RunsService {
  @Inject()
  @ModuleQualifier('')
  private readonly moduleConfig: ModuleConfig;

  public getConfigs() {
    return this.moduleConfig;
  }

}