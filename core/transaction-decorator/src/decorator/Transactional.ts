import { EggProtoImplClass, PrototypeUtil } from '@eggjs/tegg';
import { StackUtil } from '@eggjs/tegg-common-util';
import { TransactionalParams, PropagationType } from '../Common';
import { TransactionMetadataUtil } from '../util/TransactionMetadataUtil';

export function Transactional(params?: TransactionalParams) {
  const propagation = params?.propagation || PropagationType.REQUIRED;
  if (!Object.values(PropagationType).includes(propagation)) {
    throw new Error(`unknown propagation type ${propagation}`);
  }

  return function(target: any, propertyKey: PropertyKey) {
    const constructor: EggProtoImplClass = target.constructor;
    TransactionMetadataUtil.setIsTransactionClazz(constructor);
    TransactionMetadataUtil.addTransactionMetadata(constructor, {
      propagation,
      method: propertyKey,
    });
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
