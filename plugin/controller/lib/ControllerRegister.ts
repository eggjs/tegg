import { LoadUnit } from '@eggjs/tegg-metadata';
import { RootProtoManager } from './RootProtoManager';

export interface ControllerRegister {
  register(rootProtoManager: RootProtoManager, loadUnit?: LoadUnit): Promise<void>;
}
