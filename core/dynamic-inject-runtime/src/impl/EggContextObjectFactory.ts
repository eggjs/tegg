import type { EggContainerFactory, EggContext } from '@eggjs/tegg-runtime';
import { EggAbstractClazz, QualifierImplUtil } from '@eggjs/tegg-dynamic-inject';
import { EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE } from '../EggObjectFactoryPrototype';
import { AccessLevel, ContextProto, PrototypeUtil, QualifierValue } from '@eggjs/core-decorator';
import { AbstractEggObjectFactory } from '../AbstractEggObjectFactory';

@ContextProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  name: 'eggObjectFactory',
  accessLevel: AccessLevel.PUBLIC,
})
export class EggContextObjectFactory extends AbstractEggObjectFactory {
  eggContext?: EggContext;
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
