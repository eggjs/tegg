import { AccessLevel, ContextProto, Inject, ContextEventBus } from '@eggjs/tegg';

declare module '@eggjs/tegg' {
  interface Events {
    helloEgg: (msg: string) => void;
    trace: () => void,
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {
  @Inject()
  private readonly eventBus: ContextEventBus;

  cork() {
    this.eventBus.cork();
  }

  uncork() {
    this.eventBus.uncork();
  }

  hello() {
    this.eventBus.emit('helloEgg', '01');
  }

  traceTest() {
    this.eventBus.emit('trace');
  }
}
