import 'egg';
import ConfigService from '../../modules/multi-module-service/ConfigService';

declare module 'egg' {
  export interface EggModule {
    config: {
      configService: ConfigService;
    }
  }
}
