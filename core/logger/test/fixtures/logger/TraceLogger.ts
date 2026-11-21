import { BaseLogger, LoggerDecorator } from '../../..';

@LoggerDecorator({
  file: 'trace.log',
})
export class TraceLogger extends BaseLogger{}
