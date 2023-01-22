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
    return this.getClient(undefined);
  }

  getClient(dataSource: string | undefined): Realm {
    return this.leoricRegister.getOrCreateRealm(dataSource);
  }

}
