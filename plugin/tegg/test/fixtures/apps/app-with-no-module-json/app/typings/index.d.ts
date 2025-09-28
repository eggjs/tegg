import 'egg';
import ConfigService from '../../modules/config-module/ConfigService.js';

declare module 'egg' {
  export interface EggModule {
    config: {
      configService: ConfigService;
    }
  }
}
