import { Logger } from 'egg-logger';
import { LoggerFactory } from './LoggerFactory';
import { ILogger } from '../type/ILogger';
import { LoggerMetaUtil } from './LoggerUtil';

export class BaseLogger implements ILogger {

  #logger: Logger;

  constructor() {
    const options = LoggerMetaUtil.getLoggerMeta(this.constructor as any);
    this.#logger = LoggerFactory.getOrCreateLogger(options);
  }

  public debug(message: any, ...args: any[]): void {
    this.#logger.debug(message, ...args);
  }

  public error(message: any, ...args: any[]): void {
    this.#logger.error(message, ...args);
  }

  public info(message: any, ...args: any[]): void {
    this.#logger.error(message, ...args);
  }

  public warn(message: any, ...args: any[]): void {
    this.#logger.warn(message, ...args);
  }

  public write(message: any): void {
    this.#logger.write(message);
  }

}
