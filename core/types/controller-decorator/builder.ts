import { EggProtoImplClass } from '../core-decorator/index.js';
import { ControllerMetadata } from './model/index.js';

export interface ControllerMetaBuilder {
  build(): ControllerMetadata | undefined;
}

export type ControllerMetaBuilderCreator = (clazz: EggProtoImplClass) => ControllerMetaBuilder;
