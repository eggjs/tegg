import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { LoggerDecoratorParams } from '../type/LoggerDecoratorParams';
import { ILogger } from '../type/ILogger';
import is from 'is-type-of';

export const LOGGER_OPTIONS = Symbol.for('EggPrototype#loggerOptions');
export const IS_LOGGER = Symbol.for('EggPrototype#isLogger');

export class LoggerMetaUtil {
  static setLoggerMeta(clazz: EggProtoImplClass<ILogger>, params?: LoggerDecoratorParams) {
    MetadataUtil.defineMetaData(LOGGER_OPTIONS, params, clazz);
  }

  static getLoggerMeta(clazz: EggProtoImplClass<ILogger>): LoggerDecoratorParams | undefined {
    return MetadataUtil.getOwnMetaData(LOGGER_OPTIONS, clazz);
  }

  static setLoggerFlag(clazz: EggProtoImplClass<ILogger>) {
    MetadataUtil.defineMetaData(IS_LOGGER, true, clazz);
  }

  static getLoggerFlag(clazz: EggProtoImplClass<ILogger>): boolean {
    const result = MetadataUtil.getOwnMetaData<boolean>(IS_LOGGER, clazz);
    return is.undefined(result) ? false : result;
  }

}
