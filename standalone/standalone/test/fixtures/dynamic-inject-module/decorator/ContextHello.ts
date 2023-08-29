import { ContextHelloType } from '../FooType';
import { ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/tegg';
import { AbstractContextHello } from '../AbstractContextHello';

export const CONTEXT_HELLO_ATTRIBUTE = 'CONTEXT_HELLO_ATTRIBUTE';

export const ContextHello: ImplDecorator<AbstractContextHello, typeof ContextHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractContextHello, CONTEXT_HELLO_ATTRIBUTE);

