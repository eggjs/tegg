export enum SqlType {
  BLOCK = 'BLOCK',
  INSERT = 'INSERT',
  SELECT = 'SELECT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface BaseSqlMap {
  type?: SqlType;
}

export interface FullSqlMap extends BaseSqlMap {
  type: SqlType.DELETE | SqlType.INSERT | SqlType.UPDATE | SqlType.SELECT;
  sql: string;
}

export interface BlockSqlMap extends BaseSqlMap {
  type: SqlType.BLOCK;
  content: string;
}

export type SqlMap = FullSqlMap | BlockSqlMap;
