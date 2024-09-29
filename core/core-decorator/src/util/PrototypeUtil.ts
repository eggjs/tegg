import {
  EggMultiInstanceCallbackPrototypeInfo,
  EggMultiInstancePrototypeInfo,
  EggProtoImplClass,
  EggPrototypeInfo,
  EggPrototypeName,
  InjectConstructorInfo,
  InjectObjectInfo,
  InjectType,
  MultiInstancePrototypeGetObjectsContext, QualifierAttribute,
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
  static readonly INJECT_TYPE = Symbol.for('EggPrototype.injectType');
  static readonly INJECT_CONSTRUCTOR_NAME_SET = Symbol.for('EggPrototype.injectConstructorNames');
  static readonly CLAZZ_PROTO = Symbol.for('EggPrototype.clazzProto');
  static readonly MULTI_INSTANCE_CONSTRUCTOR_INDEX = Symbol.for('EggPrototype#multiInstanceConstructorIndex');
  static readonly MULTI_INSTANCE_CONSTRUCTOR_ATTRIBUTES = Symbol.for('EggPrototype#multiInstanceConstructorAttributes');

  /**
   * Mark class is egg object prototype
   * @param {Function} clazz -
   */
  static setIsEggPrototype(clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(PrototypeUtil.IS_EGG_OBJECT_PROTOTYPE, true, clazz);
  }

  /**
   * If class is egg object prototype, return true
   * @param {Function} clazz -
   */
  static isEggPrototype(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(PrototypeUtil.IS_EGG_OBJECT_PROTOTYPE, clazz);
  }

  /**
   * Mark class is egg object multi instance prototype
   * @param {Function} clazz -
   */
  static setIsEggMultiInstancePrototype(clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(PrototypeUtil.IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE, true, clazz);
  }

  /**
   * If class is egg object multi instance prototype, return true
   * @param {Function} clazz -
   */
  static isEggMultiInstancePrototype(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(PrototypeUtil.IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE, clazz);
  }

  /**
   * set class file path
   * @param {Function} clazz -
   * @param {string} filePath -
   */
  static setFilePath(clazz: EggProtoImplClass, filePath: string) {
    MetadataUtil.defineMetaData(PrototypeUtil.FILE_PATH, filePath, clazz);
  }

  /**
   * get class file path
   * @param {Function} clazz -
   */
  static getFilePath(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(PrototypeUtil.FILE_PATH, clazz);
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setProperty(clazz: EggProtoImplClass, property: EggPrototypeInfo) {
    MetadataUtil.defineMetaData(PrototypeUtil.PROTOTYPE_PROPERTY, property, clazz);
  }

  /**
   * get class property
   * @param {EggProtoImplClass} clazz -
   * @return {EggPrototypeInfo} -
   */
  static getProperty(clazz: EggProtoImplClass): EggPrototypeInfo | undefined {
    return MetadataUtil.getMetaData(PrototypeUtil.PROTOTYPE_PROPERTY, clazz);
  }

  static getInitType(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): string | undefined {
    const property = PrototypeUtil.getProperty(clazz) ?? PrototypeUtil.getMultiInstanceProperty(clazz, ctx);
    return property?.initType;
  }

  static getAccessLevel(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): string | undefined {
    const property = PrototypeUtil.getProperty(clazz) ?? PrototypeUtil.getMultiInstanceProperty(clazz, ctx);
    return property?.accessLevel;
  }

  static getObjNames(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): EggPrototypeName[] {
    const property = PrototypeUtil.getProperty(clazz);
    if (property) {
      return [ property.name ];
    }
    const multiInstanceProperty = PrototypeUtil.getMultiInstanceProperty(clazz, ctx);
    return multiInstanceProperty?.objects.map(t => t.name) || [];
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setMultiInstanceStaticProperty(clazz: EggProtoImplClass, property: EggMultiInstancePrototypeInfo) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY, property, clazz);
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setMultiInstanceCallbackProperty(clazz: EggProtoImplClass, property: EggMultiInstanceCallbackPrototypeInfo) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY, property, clazz);
  }

  /**
   * get class property
   * @param {EggProtoImplClass} clazz -
   * @param {MultiInstancePrototypeGetObjectsContext} ctx -
   */
  static getMultiInstanceProperty(clazz: EggProtoImplClass, ctx: MultiInstancePrototypeGetObjectsContext): EggMultiInstancePrototypeInfo | undefined {
    const metadata = MetadataUtil.getMetaData<EggMultiInstancePrototypeInfo>(PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY, clazz);
    if (metadata) {
      return metadata;
    }
    const callBackMetadata = MetadataUtil.getMetaData<EggMultiInstanceCallbackPrototypeInfo>(PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY, clazz);
    if (callBackMetadata) {
      return {
        ...callBackMetadata,
        objects: callBackMetadata.getObjects(ctx),
      };
    }
  }

  static setMultiInstanceConstructorAttributes(clazz: EggProtoImplClass, attributes: QualifierAttribute[]) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_ATTRIBUTES, attributes, clazz);
  }

  static getMultiInstanceConstructorAttributes(clazz: EggProtoImplClass): QualifierAttribute[] {
    return MetadataUtil.getMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_ATTRIBUTES, clazz) || [];
  }

  static setMultiInstanceConstructorIndex(clazz: EggProtoImplClass, index: number) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_INDEX, index, clazz);
  }

  static getMultiInstanceConstructorIndex(clazz: EggProtoImplClass): number | undefined {
    return MetadataUtil.getMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_INDEX, clazz);
  }

  static setInjectType(clazz: EggProtoImplClass, type: InjectType) {
    const injectType: InjectType | undefined = MetadataUtil.getMetaData(PrototypeUtil.INJECT_TYPE, clazz);
    if (!injectType) {
      MetadataUtil.defineMetaData(PrototypeUtil.INJECT_TYPE, type, clazz);
    } else if (injectType !== type) {
      throw new Error(`class ${clazz.name} already use inject type ${injectType} can not use ${type}`);
    }
  }

  static addInjectObject(clazz: EggProtoImplClass, injectObject: InjectObjectInfo) {
    const objs: InjectObjectInfo[] = MetadataUtil.initOwnArrayMetaData(PrototypeUtil.INJECT_OBJECT_NAME_SET, clazz, []);
    objs.push(injectObject);
    MetadataUtil.defineMetaData(PrototypeUtil.INJECT_OBJECT_NAME_SET, objs, clazz);
  }

  static addInjectConstructor(clazz: EggProtoImplClass, injectConstructorInfo: InjectConstructorInfo) {
    const objs: InjectConstructorInfo[] = MetadataUtil.initArrayMetaData(PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET, clazz, []);
    objs.push(injectConstructorInfo);
    MetadataUtil.defineMetaData(PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET, objs, clazz);
  }

  static getInjectType(clazz: EggProtoImplClass): InjectType | undefined {
    const injectType: InjectType | undefined = MetadataUtil.getMetaData(PrototypeUtil.INJECT_TYPE, clazz);
    return injectType;
  }

  static getInjectObjects(clazz: EggProtoImplClass): Array<InjectObjectInfo | InjectConstructorInfo> {
    const injectType: InjectType | undefined = MetadataUtil.getMetaData(PrototypeUtil.INJECT_TYPE, clazz);
    if (!injectType) {
      return [];
    }
    if (injectType === InjectType.CONSTRUCTOR) {
      return MetadataUtil.getArrayMetaData<InjectConstructorInfo>(PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET, clazz)
        .sort((a, b) => {
          return a.refIndex - b.refIndex;
        });
    }
    return MetadataUtil.getArrayMetaData(PrototypeUtil.INJECT_OBJECT_NAME_SET, clazz);
  }

  // static getInjectConstructors(clazz: EggProtoImplClass): Array<InjectConstructorInfo> {
  //   return MetadataUtil.getArrayMetaData<InjectConstructorInfo>(PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET, clazz)
  //     .sort((a, b) => {
  //       return a.refIndex - b.refIndex;
  //     });
  // }

  // TODO fix proto type
  static getClazzProto(clazz: EggProtoImplClass): object | undefined {
    return MetadataUtil.getMetaData(PrototypeUtil.CLAZZ_PROTO, clazz);
  }

  // TODO fix proto type
  static setClazzProto(clazz: EggProtoImplClass, proto: object) {
    return MetadataUtil.defineMetaData(PrototypeUtil.CLAZZ_PROTO, proto, clazz);
  }

  static getDesignType(clazz: EggProtoImplClass, propKey?: PropertyKey) {
    return MetadataUtil.getMetaData('design:type', clazz, propKey);
  }
}
