import { MetadataUtil } from './MetadataUtil';
import { MapUtil } from '@eggjs/tegg-common-util';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';
import { QualifierAttribute, QualifierInfo, QualifierValue } from '../model/QualifierInfo';

const QUALIFIER_META_DATA = Symbol.for('EggPrototype#qualifier');
const PROPERTY_QUALIFIER_META_DATA = Symbol.for('EggPrototype#propertyQualifier');

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
