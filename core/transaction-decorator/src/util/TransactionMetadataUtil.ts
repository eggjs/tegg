import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';
import { TransactionMetadata } from '../model/TransactionMetadata';

export const TRANSACTION_META_DATA = Symbol.for('EggPrototype#transaction#metaData');
export const IS_TRANSACTION_CLAZZ = Symbol.for('EggPrototype#IS_TRANSACTION_CLAZZ');

export class TransactionMetadataUtil {

  static setIsTransactionClazz(clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(IS_TRANSACTION_CLAZZ, true, clazz);
  }

  static isTransactionClazz(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(IS_TRANSACTION_CLAZZ, clazz);
  }

  static addTransactionMetadata(clazz: EggProtoImplClass, data: TransactionMetadata) {
    const list = MetadataUtil.initOwnArrayMetaData<TransactionMetadata>(TRANSACTION_META_DATA, clazz, []);
    list.push(data);
  }

  static getTransactionMetadataList(clazz: EggProtoImplClass): TransactionMetadata[] {
    return MetadataUtil.getArrayMetaData<TransactionMetadata>(TRANSACTION_META_DATA, clazz);
  }

}
