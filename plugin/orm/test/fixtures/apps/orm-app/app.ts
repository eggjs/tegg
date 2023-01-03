import { Application } from 'egg';

export default class OrmAppHook {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad() {
    await this.app.leoricRegister.ready();
    const app = this.app;
    for (const realm of this.app.leoricRegister.realmMap.values()) {
      realm.driver.logger = {
        logQuery(sql, _, options) {
          const path = options.Model?.ctx?.path;
          app.logger.info('sql: %s path: %s', sql, path);
        },
      };
    }
  }
}
