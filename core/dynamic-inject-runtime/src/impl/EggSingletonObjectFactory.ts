import type { EggContainerFactory } from '@eggjs/tegg-runtime';
import { EggAbstractClazz, QualifierImplUtil } from '@eggjs/tegg-dynamic-inject';
import { AccessLevel, PrototypeUtil, QualifierValue, SingletonProto } from '@eggjs/core-decorator';
import { AbstractEggObjectFactory } from '../AbstractEggObjectFactory';
import { EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE } from '../EggObjectFactoryPrototype';

@SingletonProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  name: 'eggObjectFactory',
  accessLevel: AccessLevel.PUBLIC,
})
export class EggSingletonObjectFactory extends AbstractEggObjectFactory {
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
}
