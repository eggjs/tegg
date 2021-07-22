# @eggjs/tegg-eventbus-plugin

## Usage

```js
// plugin.js
export.eventbusModule = {
  enable: true,
  package: '@eggjs/tegg-eventbus-plugin',
};
```

## Unittest

```ts
// test/fixtures/apps/event-app/app/event-module/HelloService
@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {
  @Inject()
  private readonly eventBus: EventBus;

  hello() {
    this.eventBus.emit('hello', '01');
  }
}

// test/fixtures/apps/event-app/app/event-module/HelloLogger
@Event('helloEgg')
export class HelloLogger {
  handle(msg: string) {
    console.log('hello, ', msg);
  }
}


// test/event.test.ts
import assert from 'assert';
import path from 'path';
import mm from 'egg-mock';
import { HelloService } from './fixtures/apps/event-app/app/event-module/HelloService';
import { HelloLogger } from './fixtures/apps/event-app/app/event-module/HelloLogger';

describe('test/eventbus.test.ts', () => {
  let app;
  let ctx;

  afterEach(async () => {
    await app.destroyModuleContext(ctx);
    mm.restore();
  });

  before(async () => {
    app = mm.app();
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('msg should work', async () => {
    ctx = await app.mockModuleContext();
    const helloService = await ctx.getEggObject(HelloService);
    let msg: string | undefined;
    // helloLogger is in child context, should mock the prototype
    mm(HelloLogger.prototype, 'handle', m => {
      msg = m;
    });
    const eventWaiter = await app.getEventWaiter();
    const helloEvent = eventWaiter.await('hello');
    helloService.hello();
    await helloEvent;
    assert(msg === '01');
  });
});

```
