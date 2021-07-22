import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';
import { EggAppConfig } from 'egg';

interface XSessionUser {
  userName: string;
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class ConfigService {
  @Inject()
  user: XSessionUser;

  @Inject()
  config: EggAppConfig;

  getBaseDir(): string {
    return this.config.baseDir;
  }

  async getCurrentUserName(): Promise<string> {
    return this.user.userName;
  }
}
