import { AccessLevel, ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';
import { EggObjectLifecycle } from '@eggjs/tegg-lifecycle';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextFooDepth2 {
  async hello() {
    return 'hello from depth2';
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBarDepth2 implements EggObjectLifecycle {
  @Inject()
  contextFooDepth2: ContextFooDepth2;

  async hello() {
    return this.contextFooDepth2.hello();
  }
}


@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextFoo {
  @Inject()
  private readonly singletonBarDepth2: SingletonBarDepth2;

  async hello() {
    return this.singletonBarDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBar implements EggObjectLifecycle {
  @Inject()
  foo: ContextFoo;

  async hello() {
    return this.foo.hello();
  }
}
