import type { EggProtoImplClass, LifecycleHookName } from '@eggjs/tegg-types';
import { LifecycleUtil } from '../LifycycleUtil';

function createLifecycle(hookName: LifecycleHookName) {
  return () => {
    return function(target: object, methodName: string) {
      const clazz = target.constructor as EggProtoImplClass;
      LifecycleUtil.setLifecycleHook(methodName, hookName, clazz);
    };
  };
}

export const LifecyclePostConstruct = createLifecycle('postConstruct');
export const LifecyclePreInject = createLifecycle('preInject');
export const LifecyclePostInject = createLifecycle('postInject');
export const LifecycleInit = createLifecycle('init');
export const LifecyclePreDestroy = createLifecycle('preDestroy');
export const LifecycleDestroy = createLifecycle('destroy');
