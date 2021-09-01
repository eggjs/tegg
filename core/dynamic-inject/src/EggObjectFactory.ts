import { EggAbstractClazz } from './typing';
import { QualifierValue } from '@eggjs/core-decorator';

export interface EggObjectFactory {
  getEggObject<T extends object>(abstractClazz: EggAbstractClazz<T>, qualifierValue: QualifierValue): Promise<T>;
}
