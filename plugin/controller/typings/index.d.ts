import 'egg';
import '@eggjs/tegg-plugin';
import '@eggjs/mcp-proxy';
import { RootProtoManager } from '../lib/RootProtoManager';
import { ControllerRegisterFactory } from '../lib/ControllerRegisterFactory';
import { ControllerMetaBuilderFactory } from '@eggjs/tegg';

declare module 'egg' {
  export interface TEggControllerApp extends MCPProxyApp {
    rootProtoManager: RootProtoManager;
    controllerRegisterFactory: ControllerRegisterFactory;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
  }

  export interface Application extends TEggControllerApp {
  }
}
