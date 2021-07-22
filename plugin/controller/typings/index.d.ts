import 'egg';
import '@eggjs/tegg-plugin';
import { RootProtoManager } from '../lib/RootProtoManager';

declare module 'egg' {
  export interface TEggControllerApp {
    rootProtoManager: RootProtoManager;
  }

  export interface Application extends TEggControllerApp {
  }
}
