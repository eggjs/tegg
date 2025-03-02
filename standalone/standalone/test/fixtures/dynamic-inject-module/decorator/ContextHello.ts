import { ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/tegg';
import { ContextHelloType } from '../FooType.js';
import { AbstractContextHello } from '../AbstractContextHello.js';

export const CONTEXT_HELLO_ATTRIBUTE = 'CONTEXT_HELLO_ATTRIBUTE';

export const ContextHello: ImplDecorator<AbstractContextHello, typeof ContextHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractContextHello, CONTEXT_HELLO_ATTRIBUTE);

