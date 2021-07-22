import { ControllerTypeLike } from '../model';
import { ControllerMetaBuilder } from './ControllerMetaBuilder';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import ControllerInfoUtil from '../util/ControllerInfoUtil';

export type ControllerMetaBuilderCreator = (clazz: EggProtoImplClass) => ControllerMetaBuilder;

export class ControllerMetaBuilderFactory {
  private static builderCreatorMap: Map<ControllerTypeLike, ControllerMetaBuilderCreator> = new Map();

  static registerControllerMetaBuilder(controllerType: ControllerTypeLike, controllerBuilderCreator: ControllerMetaBuilderCreator) {
    this.builderCreatorMap.set(controllerType, controllerBuilderCreator);
  }

  static createControllerMetaBuilder(clazz: EggProtoImplClass, controllerType?: ControllerTypeLike): ControllerMetaBuilder | undefined {
    if (!controllerType) {
      controllerType = ControllerInfoUtil.getControllerType(clazz);
    }
    if (!controllerType) {
      return;
    }
    const creator = this.builderCreatorMap.get(controllerType);
    if (!creator) {
      throw new Error(`not found controller meta builder for type ${controllerType}`);
    }
    return creator(clazz);
  }
}
