import { EggObjectName } from './InjectObjectInfo';

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
}
