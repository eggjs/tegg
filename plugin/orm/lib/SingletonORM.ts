import {
  AccessLevel,
  Inject,
  SingletonProto,
} from '@eggjs/tegg';
import { LeoricRegister } from './LeoricRegister';
import Realm from 'leoric';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Orm {
  @Inject()
  private leoricRegister: LeoricRegister;

  // default dataSource
  get client(): Realm {
    const defaultConfig = this.leoricRegister.getConfig();
    return this.leoricRegister.getRealm(defaultConfig)!;
  }

  getClient(datasource: string): Realm {
    const config = this.leoricRegister.getConfig(datasource);
    if (!config) {
      throw new Error(`not found ${datasource} datasource`);
    }
    return this.leoricRegister.getOrCreateRealm(config.database)!;
  }

}
