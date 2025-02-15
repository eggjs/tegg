import { EggObjectName } from './InjectObjectInfo.js';

export interface InjectConstructorInfo {
  /**
   * inject args index
   */
  refIndex: number;
  /**
   * inject args name
   */
  refName: string;
  /**
   * obj's name will be injected
   */
  objName: EggObjectName;
  /**
   * optional inject
   */
  optional?: boolean;
}
