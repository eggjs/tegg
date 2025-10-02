import { HTTPMethodEnum } from './model/index.js';

export interface HTTPMethodParams {
  method: HTTPMethodEnum;
  path: string;
  priority?: number;
}
