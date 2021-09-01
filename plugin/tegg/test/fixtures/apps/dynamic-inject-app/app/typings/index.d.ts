import 'egg';
import TraceService from '../../modules/multi-module-service/TraceService';
import AppService from '../../modules/multi-module-service/AppService';

declare module 'egg' {
  export interface EggModule {
    multiModuleService: {
      traceService: TraceService;
      appService: AppService;
    }
  }
}
