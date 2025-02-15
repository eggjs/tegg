import { EggProtoImplClass } from '../core-decorator/index.js';
import { ControllerMetadata } from './model/ControllerMetadata.js';

export interface ControllerMetaBuilder {
  build(): ControllerMetadata | undefined;
}

export type ControllerMetaBuilderCreator = (clazz: EggProtoImplClass) => ControllerMetaBuilder;
