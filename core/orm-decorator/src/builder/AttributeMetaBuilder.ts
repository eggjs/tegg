import type { EggProtoImplClass, ModelAttributeInfo } from '@eggjs/tegg-types';
import { AttributeMeta } from '../model/AttributeMeta';
import { ModelInfoUtil } from '../util/ModelInfoUtil';
import { NameUtil } from '../util/NameUtil';

export class AttributeMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): Array<AttributeMeta> {
    const modelAttributes = ModelInfoUtil.getModelAttributes(this.clazz);
    const attributes: Array<AttributeMeta> = [];
    if (!modelAttributes) {
      throw new Error(`model ${this.clazz.name} has no attributes`);
    }
    for (const [ propertyName, attributeInfo ] of modelAttributes) {
      const attribute = this.buildAttributeMeta(propertyName, attributeInfo);
      attributes.push(attribute);
    }
    return attributes;
  }

  private buildAttributeMeta(propertyName: string, attributeInfo: ModelAttributeInfo) {
    return new AttributeMeta(
      attributeInfo.dataType,
      propertyName,
      attributeInfo.options?.name ?? NameUtil.getAttributeName(propertyName),
      attributeInfo.options?.allowNull ?? true,
      attributeInfo.options?.autoIncrement ?? false,
      attributeInfo.options?.primary ?? false,
      attributeInfo.options?.unique ?? false,
    );
  }
}
