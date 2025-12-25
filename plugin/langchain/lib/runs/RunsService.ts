import { AccessLevel, Inject, ModuleConfig, SingletonProto } from '@eggjs/tegg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class RunsService {
  @Inject()
  private readonly moduleConfig: ModuleConfig;

  public getConfigs() {
    return this.moduleConfig;
  }

}