import { EggProtoImplClass } from '../../core-decorator/index.js';
import { SqlMap } from './SqlMap.js';

export interface BaseDaoType {
  new(...args: any[]): object;
  clazzModel: EggProtoImplClass<object>;
  clazzExtension: Record<string, SqlMap>;
  // todo: typed structure
  tableStature: object;
  tableSql: string;
}
