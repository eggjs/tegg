import 'egg';
import '@eggjs/tegg-plugin';

import { DataType } from 'leoric';
import { AttributeOptions } from '@eggjs/tegg-orm-decorator';
import { LeoricRegister } from '../lib/LeoricRegister';
import { Orm } from '../lib/SingletonORM';

declare module '@eggjs/tegg-orm-decorator' {
  export declare function Attribute(dataType: DataType, options?: AttributeOptions): (target: any, propertyKey: PropertyKey) => void;
}

declare module 'egg' {
  export interface TeggOrmApplication {
    leoricRegister: LeoricRegister;
    orm: Orm;
  }

  interface Application extends TeggOrmApplication {
  }
}
