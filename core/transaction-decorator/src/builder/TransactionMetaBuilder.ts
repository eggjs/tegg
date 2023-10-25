import { EggProtoImplClass } from '@eggjs/tegg';
import { TransactionMetadata } from '../model/TransactionMetadata';
import { TransactionMetadataUtil } from '../util/TransactionMetadataUtil';

export class TransactionMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): TransactionMetadata[] {
    if (!TransactionMetadataUtil.isTransactionClazz(this.clazz)) {
      return [];
    }
    return TransactionMetadataUtil.getTransactionMetadataList(this.clazz);
  }
}
