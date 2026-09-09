import { Logger } from 'egg-logger';
import is from 'is-type-of';
import { LoggerDecoratorParams } from '../type/LoggerDecoratorParams';
import { LoggerLevel } from './LoggerLevel';

const defaultOptions: Partial<LoggerDecoratorParams> = {
  level: LoggerLevel.INFO,
};

export class LoggerFactory {

  static #loggerMap = new Map<string, Logger>();

  static getOrCreateLogger(options?: LoggerDecoratorParams): Logger {
    const opt = {
      ...defaultOptions,
      ...options,
    };

    if (is.nullable(opt.file)) throw new Error('options.file is required');
    if (is.nullable(opt.name)) throw new Error('options.name is required');

    const name = opt.name;
    let logger = this.#loggerMap.get(name);
    if (logger) return logger;

    logger = new Logger({
      level: opt.level,
      file: opt.file,
    });
    this.#loggerMap.set(name, logger);
    return logger;
  }

  static getLogger(name: string): Logger | undefined {
    return this.#loggerMap.get(name);
  }

  // static destroyAll() {

  // }

}
