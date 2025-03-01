import '@eggjs/tegg-plugin';
import { ControllerMetaBuilderFactory } from '@eggjs/tegg';
import { RootProtoManager } from './lib/RootProtoManager.js';
import { ControllerRegisterFactory } from './lib/ControllerRegisterFactory.js';

declare module '@eggjs/core' {
  interface TEggControllerApp {
    rootProtoManager: RootProtoManager;
    controllerRegisterFactory: ControllerRegisterFactory;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
  }

  interface EggCore extends TEggControllerApp {
  }
}
