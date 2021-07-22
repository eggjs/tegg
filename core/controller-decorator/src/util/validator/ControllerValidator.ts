import ControllerInfoUtil from '../ControllerInfoUtil';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import { ClassUtil } from '@eggjs/tegg-metadata';

export class ControllerValidator {
  // should throw error
  // 1. use controller middleware but not has controller decorator
  static validate(clazz: EggProtoImplClass) {
    const controllerType = ControllerInfoUtil.getControllerType(clazz);
    const middlewares = ControllerInfoUtil.getControllerMiddlewares(clazz);
    if (middlewares.length && !controllerType) {
      const desc = ClassUtil.classDescription(clazz);
      throw new Error(`${desc} @Middleware should use with controller decorator`);
    }
  }
}
