import type { ModuleConfigs } from '@eggjs/tegg';
import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Bar {
  @Inject()
  moduleConfigs: ModuleConfigs;

  @Inject()
  moduleConfig: Record<string, any>;

  async getConfig(): Promise<object> {
    return {
      moduleConfigs: this.moduleConfigs.get('overwrite'),
      moduleConfig: this.moduleConfig,
    };
  }
}
