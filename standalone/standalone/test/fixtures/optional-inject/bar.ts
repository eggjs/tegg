import { Inject, SingletonProto } from '@eggjs/tegg';
import { InjectOptional } from '@eggjs/core-decorator';

@SingletonProto()
export class Bar {
  constructor(
    @InjectOptional() readonly hello?: object,
    @Inject({ optional: true }) readonly world?: object,
  ) {}
}
