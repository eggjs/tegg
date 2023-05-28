import { EggProtoImplClass } from '@eggjs/core-decorator';
import { LifecycleUtil } from '../LifycycleUtil';

export function LifecyclePreInject() {
  return function(target: object, methodName: string) {
    const clazz = target.constructor as EggProtoImplClass;
    LifecycleUtil.setLifecycleHook(methodName, 'preInject', clazz);
  };
}
