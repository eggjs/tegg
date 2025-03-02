import { ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/tegg';
import { SingletonHelloType } from '../FooType.js';
import { AbstractSingletonHello } from '../AbstractSingletonHello.js';

export const SINGLETON_HELLO_ATTRIBUTE = 'SINGLETON_HELLO_ATTRIBUTE';

export const SingletonHello: ImplDecorator<AbstractSingletonHello, typeof SingletonHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractSingletonHello, SINGLETON_HELLO_ATTRIBUTE);
