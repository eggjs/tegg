import { SingletonProto, Inject, ModuleQualifier } from '@eggjs/tegg';
import { FooService } from '../module-foo/FooService';

@SingletonProto()
export class BarService {
  @Inject()
  @ModuleQualifier('foo')
  fooService: FooService;

  bar() {
    console.log(this.fooService);
  }
}
