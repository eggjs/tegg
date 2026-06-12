import { ContextProto, Inject } from '@eggjs/core-decorator';
import { EggObjectFactory } from '@eggjs/tegg-dynamic-inject';
import { FactoryQualifier } from '../../../../src/FactoryQualifier';
import { AbstractContextHello } from '../base/AbstractContextHello';
import { ContextHelloType } from '../base/FooType';

@ContextProto()
export class HelloService {
  @Inject()
  @FactoryQualifier([ AbstractContextHello ])
  private readonly eggObjectFactory: EggObjectFactory;

  async hello(): Promise<string[]> {
    const helloImpls = await Promise.all([
      this.eggObjectFactory.getEggObject(AbstractContextHello, ContextHelloType.FOO),
      this.eggObjectFactory.getEggObject(AbstractContextHello, ContextHelloType.BAR),
    ]);
    const msgs = helloImpls.map(helloImpl => helloImpl.hello());
    return msgs;
  }
}
