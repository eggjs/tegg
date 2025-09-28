import '@eggjs/tegg-plugin';
import { AttributeOptions } from '@eggjs/tegg-orm-decorator';

import { LeoricRegister } from './lib/LeoricRegister.js';
import { Orm } from './lib/SingletonORM.js';
import type { OrmConfig } from './lib/DataSourceManager.js';
import type { DataType } from './lib/types.js';

export { Orm, LeoricRegister };

declare module '@eggjs/tegg-orm-decorator' {
  // @ts-expect-error: DataType is not defined in tegg-orm-decorator
  export function Attribute(dataType: DataType, options?: AttributeOptions): (target: any, propertyKey: PropertyKey) => void;
}

declare module 'egg' {
  interface EggAppConfig {
    orm: OrmConfig & {
      datasources?: OrmConfig[];
    };
  }

  interface Application {
    leoricRegister: LeoricRegister;
    orm: Orm;
  }
}
