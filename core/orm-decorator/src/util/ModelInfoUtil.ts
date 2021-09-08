import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { AttributeOptions } from '../decorator/Attribute';
import { IndexOptions } from '../decorator/Index';

export const IS_MODEL = Symbol.for('EggPrototype#model#isModel');
export const MODEL_DATA_SOURCE = Symbol.for('EggPrototype#model#dataSource');
export const MODEL_DATA_TABLE_NAME = Symbol.for('EggPrototype#model#tableName');
export const MODEL_DATA_INDICES = Symbol.for('EggPrototype#model#indices');
export const MODEL_DATA_ATTRIBUTES = Symbol.for('EggPrototype#model#attributes');

export interface ModelIndexInfo {
  fields: string[];
  options?: IndexOptions;
}

export interface ModelAttributeInfo {
  dataType: string;
  options?: AttributeOptions;
}

type ModelAttributeMap = Map<string, ModelAttributeInfo>;

export class ModelInfoUtil {
  static setIsModel(isModel: boolean, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(IS_MODEL, isModel, clazz);
  }

  static getIsModel(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(IS_MODEL, clazz);
  }

  static setDataSource(dataSource: string, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(MODEL_DATA_SOURCE, dataSource, clazz);
  }

  static getDataSource(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(MODEL_DATA_SOURCE, clazz);
  }

  static setTableName(tableName: string, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(MODEL_DATA_TABLE_NAME, tableName, clazz);
  }

  static getTableName(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(MODEL_DATA_TABLE_NAME, clazz);
  }

  static addModelIndex(fields: string[], options: IndexOptions | undefined, clazz: EggProtoImplClass) {
    const indexInfo: Array<ModelIndexInfo> = MetadataUtil.initOwnArrayMetaData(MODEL_DATA_INDICES, clazz, []);
    indexInfo.push({
      fields,
      options,
    });
  }

  static getModelIndices(clazz: EggProtoImplClass): Array<ModelIndexInfo> {
    return MetadataUtil.getArrayMetaData(MODEL_DATA_INDICES, clazz);
  }

  static addModelAttribute(dataType: string, options: AttributeOptions | undefined, clazz: EggProtoImplClass, property: string) {
    const attributeMap: ModelAttributeMap = MetadataUtil.initOwnMapMetaData(MODEL_DATA_ATTRIBUTES, clazz, new Map());
    attributeMap.set(property, {
      dataType,
      options,
    });
  }

  static getModelAttributes(clazz: EggProtoImplClass): ModelAttributeMap | undefined {
    return MetadataUtil.getMetaData(MODEL_DATA_ATTRIBUTES, clazz);
  }
}
