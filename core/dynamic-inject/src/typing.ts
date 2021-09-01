export type EggAbstractClazz<T extends object = object> = Function & {prototype: T};
