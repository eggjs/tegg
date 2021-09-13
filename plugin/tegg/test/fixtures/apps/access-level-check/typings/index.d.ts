import 'egg';
import MainService from '../../modules/module-main/MainService';

declare module 'egg' {
  export interface EggModule {
    moduleMain: {
      mainService: MainService;
    }
  }
}
