import { type ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/tegg-dynamic-inject';

import type { ContextHelloType } from '../FooType.ts';
import { AbstractContextHello } from '../AbstractContextHello.ts';

export const CONTEXT_HELLO_ATTRIBUTE = 'CONTEXT_HELLO_ATTRIBUTE';

export const ContextHello: ImplDecorator<AbstractContextHello, typeof ContextHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractContextHello, CONTEXT_HELLO_ATTRIBUTE);

