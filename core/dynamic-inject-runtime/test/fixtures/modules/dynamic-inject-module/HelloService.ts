import { ContextProto, Inject } from '@eggjs/core-decorator';
import { ContextHelloType, SingletonHelloType } from './FooType';
import { AbstractContextHello } from './AbstractContextHello';
import { AbstractSingletonHello } from './AbstractSingletonHello';
import { EggObjectFactory } from '@eggjs/tegg-dynamic-inject';

@ContextProto()
export class HelloService {
  @Inject()
  private readonly eggObjectFactory: EggObjectFactory;

  async hello(): Promise<string[]> {
    const helloImpls = await Promise.all([
      this.eggObjectFactory.getEggObject(AbstractContextHello, ContextHelloType.FOO),
      this.eggObjectFactory.getEggObject(AbstractContextHello, ContextHelloType.BAR),
      this.eggObjectFactory.getEggObject(AbstractSingletonHello, SingletonHelloType.FOO),
      this.eggObjectFactory.getEggObject(AbstractSingletonHello, SingletonHelloType.BAR),
    ]);
    const msgs = helloImpls.map(helloImpl => helloImpl.hello());
    return msgs;
  }
}
