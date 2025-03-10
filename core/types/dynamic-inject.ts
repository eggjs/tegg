import { EggProtoImplClass, QualifierValue } from './core-decorator';

export type EggAbstractClazz<T extends object = object> = Function & {prototype: T};
export type ImplTypeEnum = {
  [id: string]: QualifierValue;
};

export type ImplDecorator<T extends object, Enum extends ImplTypeEnum> = (type: Enum[keyof Enum], isForceReplacement?: boolean) => ((clazz: EggProtoImplClass<T>) => void);

export interface EggObjectFactory {
  getEggObject<T extends object>(abstractClazz: EggAbstractClazz<T>, qualifierValue: QualifierValue): Promise<T>;
  getEggObjects<T extends object>(abstractClazz: EggAbstractClazz<T>): Promise<AsyncIterable<T>>;
}

export const QUALIFIER_IMPL_MAP = Symbol.for('EggPrototype#qualifierImplMap');
