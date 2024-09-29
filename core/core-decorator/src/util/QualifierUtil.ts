import { MapUtil, ObjectUtils } from '@eggjs/tegg-common-util';
import { PROPERTY_QUALIFIER_META_DATA, QUALIFIER_META_DATA } from '@eggjs/tegg-types';
import type { EggProtoImplClass, QualifierAttribute, QualifierInfo, QualifierValue } from '@eggjs/tegg-types';
import { MetadataUtil } from './MetadataUtil';

export class QualifierUtil {
  static addProtoQualifier(clazz: EggProtoImplClass, attribute: QualifierAttribute, value: QualifierValue) {
    const qualifiers = MetadataUtil.initOwnMapMetaData(QUALIFIER_META_DATA, clazz, new Map<QualifierAttribute, QualifierValue>());
    qualifiers.set(attribute, value);
  }

  static getProtoQualifiers(clazz: EggProtoImplClass): QualifierInfo[] {
    const qualifiers: Map<QualifierAttribute, QualifierValue> | undefined = MetadataUtil.getMetaData(QUALIFIER_META_DATA, clazz);
    if (!qualifiers) {
      return [];
    }
    const res: QualifierInfo[] = [];
    for (const [ attribute, value ] of qualifiers) {
      res.push({
        attribute,
        value,
      });
    }
    return res;
  }

  static addInjectQualifier(clazz: EggProtoImplClass, property: PropertyKey | undefined, parameterIndex: number | undefined, attribute: QualifierAttribute, value: QualifierValue) {
    if (typeof parameterIndex === 'number') {
      const argNames = ObjectUtils.getConstructorArgNameList(clazz);
      const argName = argNames[parameterIndex];
      QualifierUtil.addProperQualifier(clazz, argName, attribute, value);
    } else {
      QualifierUtil.addProperQualifier((clazz as any).constructor, property!, attribute, value);
    }
  }

  static addProperQualifier(clazz: EggProtoImplClass, property: PropertyKey, attribute: QualifierAttribute, value: QualifierValue) {
    const properQualifiers = MetadataUtil.initOwnMapMetaData(PROPERTY_QUALIFIER_META_DATA, clazz, new Map<PropertyKey, Map<QualifierAttribute, QualifierValue>>());
    const qualifiers = MapUtil.getOrStore(properQualifiers, property, new Map());
    qualifiers.set(attribute, value);
  }

  static getProperQualifiers(clazz: EggProtoImplClass, property: PropertyKey): QualifierInfo[] {
    const properQualifiers: Map<PropertyKey, Map<QualifierAttribute, QualifierValue>> | undefined = MetadataUtil.getMetaData(PROPERTY_QUALIFIER_META_DATA, clazz);
    const qualifiers = properQualifiers?.get(property);
    if (!qualifiers) {
      return [];
    }
    const res: QualifierInfo[] = [];
    for (const [ attribute, value ] of qualifiers) {
      res.push({
        attribute,
        value,
      });
    }
    return res;
  }

  static getQualifierValue(clazz: EggProtoImplClass, attribute: QualifierAttribute): QualifierValue | undefined {
    const qualifiers: Map<QualifierAttribute, QualifierValue> | undefined = MetadataUtil.getMetaData(QUALIFIER_META_DATA, clazz);
    return qualifiers?.get(attribute);
  }

  static getProperQualifier(clazz: EggProtoImplClass, property: PropertyKey, attribute: QualifierAttribute): QualifierValue | undefined {
    const properQualifiers: Map<PropertyKey, Map<QualifierAttribute, QualifierValue>> | undefined = MetadataUtil.getMetaData(PROPERTY_QUALIFIER_META_DATA, clazz);
    const qualifiers = properQualifiers?.get(property);
    return qualifiers?.get(attribute);
  }
}
