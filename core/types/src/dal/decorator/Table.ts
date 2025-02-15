// Create Table https://dev.mysql.com/doc/refman/8.0/en/create-table.html
import type { InsertMethod } from '../enum/InsertMethod.js';
import type { CompressionType } from '../enum/CompressionType.js';
import type { RowFormat } from '../enum/RowFormat.js';

export interface TableParams {
  name?: string;
  dataSourceName?: string;
  comment?: string;
  autoExtendSize?: number;
  autoIncrement?: number;
  avgRowLength?: number;
  characterSet?: string;
  collate?: string;
  compression?: CompressionType;
  encryption?: boolean;
  engine?: string;
  engineAttribute?: string;
  insertMethod?: InsertMethod;
  keyBlockSize?: number;
  maxRows?: number;
  minRows?: number;
  rowFormat?: RowFormat;
  secondaryEngineAttribute?: string;
}
