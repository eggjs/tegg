import type { EggContainerFactory } from '@eggjs/tegg-runtime';
import { AccessLevel, PrototypeUtil, QualifierValue, SingletonProto } from '@eggjs/core-decorator';
import {
  EggAbstractClazz,
  EggObjectFactory as IEggObjectFactory,
  QualifierImplUtil,
} from '@eggjs/tegg-dynamic-inject';

import { EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE } from './EggObjectFactoryPrototype';

@SingletonProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  name: 'eggObjectFactory',
  accessLevel: AccessLevel.PUBLIC,
})
export class EggObjectFactory implements IEggObjectFactory {
  eggContainerFactory: typeof EggContainerFactory;

  async getEggObject<T extends object>(abstractClazz: EggAbstractClazz<T>, qualifierValue: QualifierValue) {
    const implClazz = QualifierImplUtil.getQualifierImp(abstractClazz, qualifierValue);
    if (!implClazz) {
      throw new Error(`has no impl for ${abstractClazz.name} with qualifier ${qualifierValue}`);
    }
    const protoObj: any = PrototypeUtil.getClazzProto(implClazz);
    if (!protoObj) {
      throw new Error(`can not get proto for clazz ${implClazz.name}`);
    }
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(protoObj, protoObj.name);
    return eggObject.obj as T;
  }

  async getEggObjects<T extends object>(abstractClazz: EggAbstractClazz<T>) {
    const implClazzMap = QualifierImplUtil.getQualifierImpMap(abstractClazz);
    const getEggObject = this.getEggObject.bind(this);
    const qualifierValues = Array.from(implClazzMap.keys());

    return {
      [Symbol.asyncIterator]() {
        return {
          key: 0,
          async next() {
            if (this.key === qualifierValues.length) {
              return { done: true } as IteratorResult<T>;
            }

            const value = await getEggObject(abstractClazz, qualifierValues[this.key++]);
            return { value, done: false } as IteratorResult<T>;
          },
        };
      },
    };
  }
}
