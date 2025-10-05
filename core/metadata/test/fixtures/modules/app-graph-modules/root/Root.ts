import { SingletonProto, Inject } from '@eggjs/core-decorator';
import type { UsedProto } from '../used/Used.ts';

@SingletonProto()
export class RootProto {
  @Inject() usedProto: UsedProto;
}
