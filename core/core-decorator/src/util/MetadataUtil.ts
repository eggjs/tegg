import 'reflect-metadata';
import { EggProtoImplClass } from '../model/EggPrototypeInfo';

export type MetaDataKey = symbol | string;

export class MetadataUtil {
  static deleteMetaData(metadataKey: MetaDataKey, clazz: EggProtoImplClass) {
    Reflect.deleteMetadata(metadataKey, clazz);
  }

  static defineMetaData<T>(metadataKey: MetaDataKey, metadataValue: T, clazz: EggProtoImplClass) {
    Reflect.defineMetadata(metadataKey, metadataValue, clazz);
  }

  static getOwnMetaData<T>(metadataKey: MetaDataKey, clazz: EggProtoImplClass): T | undefined {
    return Reflect.getOwnMetadata(metadataKey, clazz);
  }

  static hasMetaData(metadataKey: MetaDataKey, clazz: EggProtoImplClass): boolean {
    return Reflect.hasMetadata(metadataKey, clazz);
  }

  static getMetaData<T>(metadataKey: MetaDataKey, clazz: EggProtoImplClass): T | undefined {
    return Reflect.getMetadata(metadataKey, clazz);
  }

  static getBooleanMetaData(metadataKey: MetaDataKey, clazz: EggProtoImplClass): boolean {
    return !!this.getMetaData(metadataKey, clazz);
  }

  static getArrayMetaData<T>(metadataKey: MetaDataKey, clazz: EggProtoImplClass): Array<T> {
    return this.getMetaData(metadataKey, clazz) || [];
  }

  /**
   * init own array metadata
   * if parent metadata exists, inherit
   * if parent metadata not exits, use default value
   * return value true means use default value
   * return value false means use map value
   */
  static initOwnArrayMetaData<T>(metadataKey: MetaDataKey, clazz: EggProtoImplClass, defaultValue: Array<T>): Array<T> {
    const ownMetaData: Array<T> | undefined = this.getOwnMetaData(metadataKey, clazz);
    if (!ownMetaData) {
      const parentValue: Array<T> | undefined = this.getMetaData(metadataKey, clazz);
      const ownDefaultValue = parentValue || defaultValue;
      const selfValue = ownDefaultValue.slice();
      this.defineMetaData(metadataKey, selfValue, clazz);
    }
    return this.getOwnMetaData<Array<T>>(metadataKey, clazz)!;
  }

  /**
   * init own map metadata
   * if parent metadata exists, inherit
   * if parent metadata not exits, use default value
   * return value true means use default value
   * return value false means use map value
   */
  static initOwnMapMetaData<K, V>(metadataKey: MetaDataKey, clazz: EggProtoImplClass, defaultValue: Map<K, V>): Map<K, V> {
    const ownMetaData: Map<K, V> | undefined = this.getOwnMetaData(metadataKey, clazz);
    if (!ownMetaData) {
      const parentValue: Map<K, V> | undefined = this.getMetaData(metadataKey, clazz);
      const selfValue = new Map<K, V>();
      const ownDefaultValue = parentValue || defaultValue;
      for (const [ k, v ] of ownDefaultValue) {
        selfValue.set(k, v);
      }
      this.defineMetaData(metadataKey, selfValue, clazz);
    }
    return this.getOwnMetaData<Map<K, V>>(metadataKey, clazz)!;
  }

  static getOrStoreMetaData<T>(metadataKey: MetaDataKey, clazz: EggProtoImplClass, metadataValue: T): T {
    if (!Reflect.hasMetadata(metadataKey, clazz)) {
      Reflect.defineMetadata(metadataKey, metadataValue, clazz);
    }
    return Reflect.getMetadata(metadataKey, clazz);
  }
}
