import { Prototype } from '@eggjs/core-decorator';

@Prototype()
export class ObserveYield {
  static eventLoopYielded = (global as any).__teggLoaderEventLoopYielded;
}
