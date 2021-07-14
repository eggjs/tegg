import {
  AccessLevel,
  InitTypeQualifier,
  Inject,
  ObjectInitType,
  SingletonProto,
} from '@eggjs/tegg';
import { EggLogger } from 'egg-logger';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class SingletonFooService {
  @Inject()
  @InitTypeQualifier(ObjectInitType.SINGLETON)
  logger: EggLogger;

  async printLog(): Promise<void> {
    this.logger.info('hello logger');
  }
}
