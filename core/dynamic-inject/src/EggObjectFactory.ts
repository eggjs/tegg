import { QualifierValue } from '@eggjs/core-decorator';

import { EggAbstractClazz } from './typing';

export interface EggObjectFactory {
  getEggObject<T extends object>(abstractClazz: EggAbstractClazz<T>, qualifierValue: QualifierValue): Promise<T>;
  getEggObjects<T extends object>(abstractClazz: EggAbstractClazz<T>): Promise<AsyncIterable<T>>;
}
