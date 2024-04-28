import { EggProtoImplClass } from '../../core-decorator';
import { SqlMap } from './SqlMap';


export interface BaseDaoType {
  new(...args: any[]): object;
  clazzModel: EggProtoImplClass<object>;
  clazzExtension: Record<string, SqlMap>;
  // todo: typed structure
  tableStature: object;
  tableSql: string;
}
