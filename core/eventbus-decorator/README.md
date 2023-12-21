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

### cork events

Cache events in memory until uncork.

```ts
class Foo {
  @Inject()
  private readonly eventBus: ContextEventBus;

  bar() {
    this.eventBus.cork();
    // ...do something
    this.eventBus.emit('hello', '01');
    // ...do other things
    
    // emit all cached events
    this.eventBus.uncork();
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

### handle multiple event
```ts
@Event('hello')
@Event('hi')
export class Foo {
  async handle(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}
```
