import 'egg';
import '@eggjs/tegg-plugin';

import { DataType } from 'leoric';
import { AttributeOptions } from '@eggjs/tegg-orm-decorator';

declare module '@eggjs/tegg-orm-decorator' {
  export declare function Attribute(dataType: DataType, options?: AttributeOptions): (target: any, propertyKey: PropertyKey) => void;
}
