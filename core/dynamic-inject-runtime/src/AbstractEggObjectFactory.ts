import { EggAbstractClazz, EggObjectFactory } from '@eggjs/tegg-dynamic-inject';
import type { EggContainerFactory, EggContext } from '@eggjs/tegg-runtime';
import { QualifierValue } from '@eggjs/core-decorator';

export abstract class AbstractEggObjectFactory implements EggObjectFactory {
  eggContext?: EggContext;
  eggContainerFactory: typeof EggContainerFactory;

  abstract getEggObject<T extends object>(abstractClazz: EggAbstractClazz<T>, qualifierValue: QualifierValue): Promise<T>;
}
