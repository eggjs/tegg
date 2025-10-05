import { Inject, SingletonProto } from '@eggjs/tegg';
import type { FooService } from '../module-foo/FooService.js';

@SingletonProto()
export class BarService1 {
  @Inject()
  fooService: FooService;

  type() {
    return this.fooService.type;
  }
}
