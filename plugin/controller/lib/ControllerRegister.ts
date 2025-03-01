import { LoadUnit } from '@eggjs/tegg-metadata';
import { RootProtoManager } from './RootProtoManager.js';

export interface ControllerRegister {
  register(rootProtoManager: RootProtoManager, loadUnit?: LoadUnit): Promise<void>;
}
