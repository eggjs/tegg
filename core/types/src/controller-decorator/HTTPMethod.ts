import { HTTPMethodEnum } from './model/types.js';

export interface HTTPMethodParams {
  method: HTTPMethodEnum;
  path: string;
  priority?: number;
}
