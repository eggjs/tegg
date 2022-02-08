import { AccessLevel, Inject, EggObjectFactory, SingletonProto } from '@eggjs/tegg';
import { SingletonHelloType } from './FooType';
import { AbstractSingletonHello } from './AbstractSingletonHello';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonHelloService {
  @Inject()
  private readonly eggObjectFactory: EggObjectFactory;

  async hello(): Promise<string[]> {
    const helloImpls = await Promise.all([
      this.eggObjectFactory.getEggObject(AbstractSingletonHello, SingletonHelloType.FOO),
      this.eggObjectFactory.getEggObject(AbstractSingletonHello, SingletonHelloType.BAR),
    ]);
    const msgs = helloImpls.map(helloImpl => helloImpl.hello());
    return msgs;
  }
}
