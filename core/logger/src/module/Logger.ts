import { LoggerDecorator } from '../decorator/LoggerDecorator';
import { BaseLogger } from '../logger/BaseLogger';

@LoggerDecorator({
  name: 'logger',
  transports: [
    new (require('egg-logger').EggConsoleTransport)({
  ],
})
export class Logger extends BaseLogger {}
