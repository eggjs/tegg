import { ControllerMetadata } from '../model/ControllerMetadata';

export interface ControllerMetaBuilder {
  build(): ControllerMetadata | undefined;
}
