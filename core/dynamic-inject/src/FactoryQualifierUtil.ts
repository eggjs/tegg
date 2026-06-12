import { MetadataUtil } from '@eggjs/core-decorator';
import { MapUtil, ObjectUtils } from '@eggjs/tegg-common-util';
import { DYNAMIC_RANGE_META_DATA } from '@eggjs/tegg-types';
import type { EggAbstractClazz, EggProtoImplClass } from '@eggjs/tegg-types';

export class FactoryQualifierUtil {

  static addProperQualifier(clazz: EggProtoImplClass, property: PropertyKey | undefined, parameterIndex: number | undefined, value: EggAbstractClazz | EggAbstractClazz[]) {
    if (typeof parameterIndex === 'number') {
      const argNames = ObjectUtils.getConstructorArgNameList(clazz);
      const argName = argNames[parameterIndex];
      const properQualifiers = MetadataUtil.initOwnMapMetaData(DYNAMIC_RANGE_META_DATA, clazz, new Map<PropertyKey, EggAbstractClazz | EggAbstractClazz[]>());
      MapUtil.getOrStore(properQualifiers, argName, value);
    } else {
      const properQualifiers = MetadataUtil.initOwnMapMetaData(DYNAMIC_RANGE_META_DATA, (clazz as any).constructor, new Map<PropertyKey, EggAbstractClazz | EggAbstractClazz[]>());
      MapUtil.getOrStore(properQualifiers, property, value);
    }
  }

  static getProperQualifiers(clazz: EggProtoImplClass, property: PropertyKey): EggAbstractClazz[] {
    const properQualifiers: Map<PropertyKey, EggAbstractClazz | EggAbstractClazz[]> | undefined = MetadataUtil.getMetaData(DYNAMIC_RANGE_META_DATA, clazz);
    const dynamics = properQualifiers?.get(property);
    if (!dynamics) {
      return [];
    }
    if (Array.isArray(dynamics)) {
      return dynamics;
    }
    return [ dynamics ];
  }
}
