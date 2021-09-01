import { EggAbstractClazz } from './typing';
import { QualifierImplUtil } from './QualifierImplUtil';
import { EggProtoImplClass, QualifierAttribute, QualifierUtil, QualifierValue } from '@eggjs/core-decorator';

export type ImplTypeEnum = {
  [id: string]: QualifierValue;
};

export type ImplDecorator<T extends object, Enum extends ImplTypeEnum> = (type: Enum[keyof Enum]) => ((clazz: EggProtoImplClass<T>) => void);

export class QualifierImplDecoratorUtil {
  static generatorDecorator<T extends object, Enum extends ImplTypeEnum>(abstractClazz: EggAbstractClazz<T>, attribute: QualifierAttribute): ImplDecorator<T, Enum> {
    return function(type: Enum[keyof Enum]) {
      return function(clazz: EggProtoImplClass<T>) {
        QualifierImplUtil.addQualifierImpl(abstractClazz, type, clazz);
        QualifierUtil.addProtoQualifier(clazz, attribute, type);
      };
    };
  }
}
