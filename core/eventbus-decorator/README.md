# `@eggjs/eventbus-decorator`

## Usage

### emit event
```ts
import { EventBus } from '@eggjs/eventbus-decorator'

// Define event first.
// Ts can check event and args type for you.
declare module '@eggjs/eventbus-decorator' {
  interface Events {
    hello: (msg: string) => Promise<void>;
  }
}

class Foo {
  @Inject()
  private readonly eventBus: EventBus;

  bar() {
    this.eventBus.emit('hello', '01');
  }
}
```

### handle event

```ts
@Event('hello')
export class Foo {
  async handle(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}
```
