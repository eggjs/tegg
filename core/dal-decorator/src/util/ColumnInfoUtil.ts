import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { ColumnParams, ColumnTypeParams } from '../decorator/Column';

export const DAL_COLUMN_INFO_MAP = Symbol('EggPrototype#dalColumnInfoMap');
export const DAL_COLUMN_TYPE_MAP = Symbol('EggPrototype#dalColumnTypeMap');
export type ColumnInfoMap = Map<string, ColumnParams>;
export type ColumnTypeMap = Map<string, ColumnTypeParams>;

export class ColumnInfoUtil {
  static addColumnInfo(clazz: EggProtoImplClass, property: string, column: ColumnInfoUtil) {
    const columnInfoMap = MetadataUtil.initOwnMapMetaData(DAL_COLUMN_INFO_MAP, clazz, new Map());
    columnInfoMap.set(property, column);
  }

  static addColumnType(clazz: EggProtoImplClass, property: string, type: ColumnTypeParams) {
    const columnInfoMap = MetadataUtil.initOwnMapMetaData(DAL_COLUMN_TYPE_MAP, clazz, new Map());
    columnInfoMap.set(property, type);
  }

  static getColumnInfoMap(clazz: EggProtoImplClass): ColumnInfoMap | undefined {
    return MetadataUtil.getMetaData(DAL_COLUMN_INFO_MAP, clazz);
  }

  static getColumnTypeMap(clazz: EggProtoImplClass): ColumnTypeMap | undefined {
    return MetadataUtil.getMetaData(DAL_COLUMN_TYPE_MAP, clazz);
  }
}
