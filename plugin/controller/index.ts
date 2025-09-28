import '@eggjs/tegg-plugin';
import { ControllerMetaBuilderFactory } from '@eggjs/tegg';

import { RootProtoManager } from './lib/RootProtoManager.js';
import { ControllerRegisterFactory } from './lib/ControllerRegisterFactory.js';

declare module 'egg' {
  interface TEggControllerApp {
    rootProtoManager: RootProtoManager;
    controllerRegisterFactory: ControllerRegisterFactory;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
  }

  interface Application extends TEggControllerApp {
  }
}
