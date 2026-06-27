import { AccessLevel, Inject, EggObjectFactory, ContextProto, FactoryQualifier } from '@eggjs/tegg';
import { ContextHelloType } from './FooType';
import { AbstractSingletonHello } from './AbstractSingletonHello';
import { AbstractContextHello } from './AbstractContextHello';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class FactoryQualifierService {
  @Inject()
  @FactoryQualifier(AbstractSingletonHello)
  private readonly eggObjectFactory: EggObjectFactory;

  async hello(): Promise<string[]> {
    try {
      const helloImpl = await this.eggObjectFactory.getEggObject(AbstractContextHello, ContextHelloType.FOO);
      const msgs = [ helloImpl.hello() ];
      return msgs;
    } catch (err) {
      return [ err.message ];
    }
  }
}
