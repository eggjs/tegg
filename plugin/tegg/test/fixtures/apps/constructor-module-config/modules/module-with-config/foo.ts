import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Foo {
  readonly foo: string;
  readonly bar: string;

  constructor(@Inject() moduleConfig: Record<string, any>) {
    this.foo = moduleConfig.features.dynamic.foo;
    this.bar = moduleConfig.features.dynamic.bar;
  }
}
