import { AccessLevel, Inject, ModuleConfig, ModuleConfigs, SingletonProto } from '@eggjs/tegg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class RunsService {
  @Inject()
  private readonly moduleConfigs: ModuleConfigs;

  @Inject()
  private readonly moduleConfig: ModuleConfig;

  public getAllAgentConfigs() {
    const agentConfigs = new Map<string, {}>();
    for (const [moduleName, moduleInfo] of this.moduleConfigs) {
      if (moduleInfo.config && Object.keys(moduleInfo.config).length > 0) {
        agentConfigs.set(moduleName, moduleInfo.config);
      }
    }
    return agentConfigs;
  }

}