import 'egg';
import TraceService from '../../modules/multi-module-service/TraceService.js';
import AppService from '../../modules/multi-module-service/AppService.js';

declare module 'egg' {
  export interface EggModule {
    multiModuleService: {
      traceService: TraceService;
      appService: AppService;
    }
  }
}
