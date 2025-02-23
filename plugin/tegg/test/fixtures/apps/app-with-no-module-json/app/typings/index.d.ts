import 'egg';
import ConfigService from '../../modules/config-module/ConfigService.js';

declare module '@eggjs/core' {
  export interface EggModule {
    config: {
      configService: ConfigService;
    }
  }
}
