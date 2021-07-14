import { MetadataUtil } from './MetadataUtil';
import { EggProtoImplClass, EggPrototypeInfo } from '../model/EggPrototypeInfo';
import { InjectObjectInfo } from '../model/InjectObjectInfo';

export class PrototypeUtil {
  static readonly IS_EGG_OBJECT_PROTOTYPE = Symbol.for('EggPrototype#isEggPrototype');
  static readonly FILE_PATH = Symbol.for('EggPrototype.filePath');
  static readonly PROTOTYPE_PROPERTY = Symbol.for('EggPrototype.Property');
  static readonly INJECT_OBJECT_NAME_SET = Symbol.for('EggPrototype.injectObjectNames');
  static readonly CLAZZ_PROTO = Symbol.for('EggPrototype.clazzProto');

  /**
   * Mark class is egg object prototype
   * @param {Function} clazz -
   */
  static setIsEggPrototype(clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(this.IS_EGG_OBJECT_PROTOTYPE, true, clazz);
  }

  /**
   * If class is egg object prototype, return true
   * @param {Function} clazz -
   */
  static isEggPrototype(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(this.IS_EGG_OBJECT_PROTOTYPE, clazz);
  }

  /**
   * set class file path
   * @param {Function} clazz -
   * @param {string} filePath -
   */
  static setFilePath(clazz: EggProtoImplClass, filePath: string) {
    MetadataUtil.defineMetaData(this.FILE_PATH, filePath, clazz);
  }

  /**
   * get class file path
   * @param {Function} clazz -
   */
  static getFilePath(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(this.FILE_PATH, clazz);
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setProperty(clazz: EggProtoImplClass, property: EggPrototypeInfo) {
    MetadataUtil.defineMetaData(this.PROTOTYPE_PROPERTY, property, clazz);
  }

  /**
   * get class property
   * @param {EggProtoImplClass} clazz -
   * @return {EggPrototypeInfo} -
   */
  static getProperty(clazz: EggProtoImplClass): EggPrototypeInfo | undefined {
    return MetadataUtil.getMetaData(this.PROTOTYPE_PROPERTY, clazz);
  }

  static addInjectObject(clazz: EggProtoImplClass, injectObject: InjectObjectInfo) {
    const objs: InjectObjectInfo[] = MetadataUtil.initOwnArrayMetaData(this.INJECT_OBJECT_NAME_SET, clazz, []);
    objs.push(injectObject);
    MetadataUtil.defineMetaData(this.INJECT_OBJECT_NAME_SET, objs, clazz);
  }

  static getInjectObjects(clazz: EggProtoImplClass): Array<InjectObjectInfo> {
    return MetadataUtil.getArrayMetaData(this.INJECT_OBJECT_NAME_SET, clazz);
  }

  // TODO fix proto type
  static getClazzProto(clazz: EggProtoImplClass): object | undefined {
    return MetadataUtil.getMetaData(this.CLAZZ_PROTO, clazz);
  }

  // TODO fix proto type
  static setClazzProto(clazz: EggProtoImplClass, proto: object) {
    return MetadataUtil.defineMetaData(this.CLAZZ_PROTO, proto, clazz);
  }
}
