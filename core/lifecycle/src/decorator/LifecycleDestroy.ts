import { EggProtoImplClass } from '@eggjs/core-decorator';
import { LifecycleUtil } from '../LifycycleUtil';

export function LifecycleDestroy() {
  return function(target: object, propertyKey: PropertyKey) {
    const clazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    LifecycleUtil.setLifecycleHook(methodName, 'destroy', clazz);
  };
}
