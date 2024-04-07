import { SqlType } from '../dal-decorator';

export interface GenerateSqlMap {
  name: string;
  type: SqlType.DELETE | SqlType.UPDATE | SqlType.INSERT | SqlType.SELECT;
  sql: string;
}

export interface CodeGeneratorOptions {
  moduleDir: string;
  moduleName: string;
  teggPkg?: string;
  dalPkg?: string;
}

export enum Templates {
  BASE_DAO = 'base_dao',
  DAO = 'dao',
  EXTENSION = 'extension',
}
