export interface ILogger {
  error(message: any, ...args: any[]): void;
  warn(message: any, ...args: any[]): void;
  info(message: any, ...args: any[]): void;
  debug(message: any, ...args: any[]): void;
  write(message: any, ...args: any[]): void;
}
