import { HTTPMethodEnum } from './model/types';

export interface HTTPMethodParams {
  method: HTTPMethodEnum;
  path: string;
  priority?: number;
  timeout?: number;
}
