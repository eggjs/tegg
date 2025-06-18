import { RootProtoManager } from './RootProtoManager';

export interface ControllerRegister {
  register(rootProtoManager: RootProtoManager): Promise<void>;
}
