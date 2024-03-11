// Create Table https://dev.mysql.com/doc/refman/8.0/en/create-table.html

import { AccessLevel, EggProtoImplClass, ObjectInitType, Prototype, PrototypeUtil } from '@eggjs/core-decorator';
import { TableInfoUtil } from '../util/TableInfoUtil';
import { InsertMethod } from '../enum/InsertMethod';
import { StackUtil } from '@eggjs/tegg-common-util';
import { CompressionType } from '../enum/CompressionType';
import { RowFormat } from '../enum/RowFormat';

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

export function Table(params?: TableParams) {
  return function(constructor: EggProtoImplClass) {
    TableInfoUtil.setIsTable(constructor);
    if (params) {
      TableInfoUtil.setTableParams(constructor, params);
    }
    const func = Prototype({
      accessLevel: AccessLevel.PUBLIC,
      initType: ObjectInitType.ALWAYS_NEW,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
