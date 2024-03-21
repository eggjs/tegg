import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { TableParams } from '../decorator/Table';

export const DAL_IS_TABLE = Symbol('EggPrototype#dalIsTable');
export const DAL_TABLE_PARAMS = Symbol('EggPrototype#dalTableParams');

export const TABLE_CLAZZ_LIST: Array<EggProtoImplClass> = [];

export class TableInfoUtil {
  static setIsTable(clazz: EggProtoImplClass) {
    TABLE_CLAZZ_LIST.push(clazz);
    MetadataUtil.defineMetaData(DAL_IS_TABLE, true, clazz);
  }

  // TODO del
  static getClazzList() {
    return TABLE_CLAZZ_LIST;
  }

  static getIsTable(clazz: EggProtoImplClass) {
    return MetadataUtil.getMetaData(DAL_IS_TABLE, clazz) === true;
  }

  static setTableParams(clazz: EggProtoImplClass, params: TableParams) {
    MetadataUtil.defineMetaData(DAL_TABLE_PARAMS, params, clazz);
  }

  static getTableParams(clazz: EggProtoImplClass): TableParams | undefined {
    return MetadataUtil.getMetaData(DAL_TABLE_PARAMS, clazz);
  }
}
