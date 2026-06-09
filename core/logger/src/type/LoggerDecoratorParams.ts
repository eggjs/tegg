import { LoggerLevel } from '../logger/LoggerLevel';

export interface LoggerDecoratorParams {
  name?: string;
  level?: LoggerLevel;
  file: string;
  // encoding?: string;
  // consoleLevel?: LoggerLevel;
  // formatter?: (meta?: LoggerMeta) => string;
  // paddingMessageFormatter?: (ctx: object) => string;
  // jsonFile?: string;
  // outputJSON?: boolean;
  // buffer?: boolean;
  // dateISOFormat?: boolean;
  // eol?: string;
  // concentrateError?: 'duplicate' | 'redirect' | 'ignore';
}
