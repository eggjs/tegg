import { SingletonProto, Inject } from '@eggjs/tegg';
import type { UsedProto } from 'used/Used';

@SingletonProto()
export class RootProto {
  @Inject() usedProto: UsedProto;
}
