import { AccessLevel, ContextProto, Inject, EventBus } from '@eggjs/tegg';

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
  private readonly eventBus: EventBus;

  hello() {
    this.eventBus.emit('helloEgg', '01');
  }

  traceTest() {
    this.eventBus.emit('trace');
  }
}
