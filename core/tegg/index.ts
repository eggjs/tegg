export * from '@eggjs/core-decorator';
export * from '@eggjs/tegg-lifecycle';
export * from '@eggjs/controller-decorator';
export * from '@eggjs/eventbus-decorator';
export * from '@eggjs/tegg-dynamic-inject';
export * from '@eggjs/tegg-background-task';
export * as aop from '@eggjs/aop-decorator';
export * as orm from '@eggjs/tegg-orm-decorator';
export * as schedule from '@eggjs/tegg-schedule-decorator';
export { RuntimeConfig, ModuleConfigs, ModuleConfigHolder } from '@eggjs/tegg-common-util';

export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
}
