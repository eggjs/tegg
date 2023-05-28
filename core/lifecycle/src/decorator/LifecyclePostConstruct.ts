import { EggProtoImplClass } from '@eggjs/core-decorator';
import { LifecycleUtil } from '../LifycycleUtil';

export function LifecyclePostConstruct() {
  return function(target: object, methodName: string) {
    const clazz = target.constructor as EggProtoImplClass;
    LifecycleUtil.setLifecycleHook(methodName, 'postConstruct', clazz);
  };
}
