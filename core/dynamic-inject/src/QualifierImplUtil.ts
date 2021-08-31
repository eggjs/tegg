import { EggAbstractClazz } from './typing';
import { EggProtoImplClass, MetadataUtil, QualifierValue } from '@eggjs/core-decorator';

export const QUALIFIER_IMPL_MAP = Symbol.for('EggPrototype#qualifierImplMap');

export class QualifierImplUtil {
  static addQualifierImpl(abstractClazz: EggAbstractClazz, qualifierValue: QualifierValue, implClazz: EggProtoImplClass) {
    const implMap = MetadataUtil.initOwnMapMetaData(QUALIFIER_IMPL_MAP, abstractClazz as unknown as EggProtoImplClass, new Map());
    implMap.set(qualifierValue, implClazz);
  }

  static getQualifierImp(abstractClazz: EggAbstractClazz, qualifierValue: QualifierValue):EggProtoImplClass | undefined {
    const implMap: Map<QualifierValue, EggProtoImplClass> | undefined = MetadataUtil.getMetaData(QUALIFIER_IMPL_MAP, abstractClazz as unknown as EggProtoImplClass);
    return implMap?.get(qualifierValue);
  }
}
