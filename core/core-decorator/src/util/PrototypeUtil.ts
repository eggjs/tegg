import type {
  EggMultiInstanceCallbackPrototypeInfo,
  EggMultiInstancePrototypeInfo,
  EggProtoImplClass,
  EggPrototypeInfo,
  EggPrototypeName,
  InjectObjectInfo,
  MultiInstancePrototypeGetObjectsContext,
} from '@eggjs/tegg-types';
import { MetadataUtil } from './MetadataUtil';

export class PrototypeUtil {
  static readonly IS_EGG_OBJECT_PROTOTYPE = Symbol.for('EggPrototype#isEggPrototype');
  static readonly IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE = Symbol.for('EggPrototype#isEggMultiInstancePrototype');
  static readonly FILE_PATH = Symbol.for('EggPrototype.filePath');
  static readonly PROTOTYPE_PROPERTY = Symbol.for('EggPrototype.Property');
  static readonly MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY = Symbol.for('EggPrototype.MultiInstanceStaticProperty');
  static readonly MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY = Symbol.for('EggPrototype.MultiInstanceCallbackProperty');
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
   * Mark class is egg object multi instance prototype
   * @param {Function} clazz -
   */
  static setIsEggMultiInstancePrototype(clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(this.IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE, true, clazz);
  }

  /**
   * If class is egg object multi instance prototype, return true
   * @param {Function} clazz -
   */
  static isEggMultiInstancePrototype(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(this.IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE, clazz);
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

  static getInitType(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): string | undefined {
    const property = this.getProperty(clazz) ?? this.getMultiInstanceProperty(clazz, ctx);
    return property?.initType;
  }

  static getAccessLevel(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): string | undefined {
    const property = this.getProperty(clazz) ?? this.getMultiInstanceProperty(clazz, ctx);
    return property?.accessLevel;
  }

  static getObjNames(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): EggPrototypeName[] {
    const property = this.getProperty(clazz);
    if (property) {
      return [ property.name ];
    }
    const multiInstanceProperty = this.getMultiInstanceProperty(clazz, ctx);
    return multiInstanceProperty?.objects.map(t => t.name) || [];
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setMultiInstanceStaticProperty(clazz: EggProtoImplClass, property: EggMultiInstancePrototypeInfo) {
    MetadataUtil.defineMetaData(this.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY, property, clazz);
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setMultiInstanceCallbackProperty(clazz: EggProtoImplClass, property: EggMultiInstanceCallbackPrototypeInfo) {
    MetadataUtil.defineMetaData(this.MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY, property, clazz);
  }

  /**
   * get class property
   * @param {EggProtoImplClass} clazz -
   * @param {MultiInstancePrototypeGetObjectsContext} ctx -
   */
  static getMultiInstanceProperty(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): EggMultiInstancePrototypeInfo | undefined {
    const metadata = MetadataUtil.getMetaData<EggMultiInstancePrototypeInfo>(this.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY, clazz);
    if (metadata) {
      return metadata;
    }
    const callBackMetadata = MetadataUtil.getMetaData<EggMultiInstanceCallbackPrototypeInfo>(this.MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY, clazz);
    if (callBackMetadata) {
      return {
        ...callBackMetadata,
        objects: callBackMetadata.getObjects(ctx),
      };
    }
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

  static getDesignType(clazz: EggProtoImplClass, propKey?: PropertyKey) {
    return MetadataUtil.getMetaData('design:type', clazz, propKey);
  }
}
