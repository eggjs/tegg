import { SingletonHelloType } from '../FooType';
import { ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/tegg-dynamic-inject';
import { AbstractSingletonHello } from '../AbstractSingletonHello';

export const SINGLETON_HELLO_ATTRIBUTE = 'SINGLETON_HELLO_ATTRIBUTE';

export const SingletonHello: ImplDecorator<AbstractSingletonHello, typeof SingletonHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractSingletonHello, SINGLETON_HELLO_ATTRIBUTE);
