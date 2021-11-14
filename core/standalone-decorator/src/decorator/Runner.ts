import { MainRunnerClass } from '../typing';
import { StandaloneUtil } from '../util/StandaloneUtil';

export function Runner<T>() {
  return function(clazz: MainRunnerClass<T>) {
    StandaloneUtil.setMainRunner(clazz as unknown as MainRunnerClass<void>);
  };
}
