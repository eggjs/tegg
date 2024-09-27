import { SingletonProto, Inject } from '@eggjs/core-decorator';
import { UsedProto } from '../used/Used';

@SingletonProto()
export class RootConstructorProto {
  constructor(@Inject() readonly usedProto: UsedProto) {
  }
}
