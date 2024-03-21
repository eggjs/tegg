import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { IndexParams } from '../decorator/Index';

export const DAL_INDEX_LIST = Symbol('EggPrototype#dalIndexList');

export class IndexInfoUtil {
  static addIndex(clazz: EggProtoImplClass, index: IndexParams) {
    const indexList: Array<IndexParams> = MetadataUtil.initOwnArrayMetaData(DAL_INDEX_LIST, clazz, []);
    indexList.push(index);
  }

  static getIndexList(clazz: EggProtoImplClass): Array<IndexParams> {
    return MetadataUtil.getMetaData(DAL_INDEX_LIST, clazz) || [];
  }
}
