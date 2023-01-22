import { ContextProto, Inject } from '@eggjs/tegg';
import { Orm } from '@eggjs/tegg-orm-plugin/lib/SingletonORM';

@ContextProto()
export class DBService {
  @Inject()
  private readonly orm: Orm;

  async getClient(name: string) {
    return this.orm.getClient(name);
  }

  async getDefaultClient() {
    return this.orm.client;
  }

}
