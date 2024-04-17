import { EggProtoImplClass } from '../core-decorator';
import { ControllerMetadata } from './model/ControllerMetadata';

export interface ControllerMetaBuilder {
  build(): ControllerMetadata | undefined;
}

export type ControllerMetaBuilderCreator = (clazz: EggProtoImplClass) => ControllerMetaBuilder;
