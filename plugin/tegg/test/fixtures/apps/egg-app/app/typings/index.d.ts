import 'egg';
import type TraceService from '../../modules/multi-module-service/TraceService.js';
import type AppService from '../../modules/multi-module-service/AppService.js';
import type ConfigService from '../../modules/multi-module-service/ConfigService.js';
import type CustomLoggerService from '../../modules/multi-module-service/CustomLoggerService.js';
import type GlobalAppRepo from '../../modules/multi-module-repo/GlobalAppRepo.js';

declare module 'egg' {
  export interface EggModule {
    multiModuleService: {
      traceService: TraceService;
      appService: AppService;
      configService: ConfigService;
      customLoggerService: CustomLoggerService;
    }
    multiModuleRepo: {
      globalAppRepo: GlobalAppRepo;
    }
  }
}
