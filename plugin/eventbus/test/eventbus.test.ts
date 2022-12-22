import assert from 'assert';
import path from 'path';
import mm from 'egg-mock';
import sleep from 'mz-modules/sleep';
import { HelloService } from './fixtures/apps/event-app/app/event-module/HelloService';
import { HelloLogger } from './fixtures/apps/event-app/app/event-module/HelloLogger';

describe('test/eventbus.test.ts', () => {
  let app;
  let ctx;

  afterEach(async () => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../');
    });
    app = mm.app({
      baseDir: path.join(__dirname, './fixtures/apps/event-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('msg should work', async () => {
    ctx = await app.mockModuleContext();
    const helloService = await ctx.getEggObject(HelloService);
    let msg: string | undefined;
    // helloLogger is in child context
    mm(HelloLogger.prototype, 'handle', m => {
      msg = m;
    });
    const eventWaiter = await app.getEventWaiter();
    const helloEvent = eventWaiter.await('helloEgg');
    helloService.hello();
    await helloEvent;
    assert(msg === '01');
  });

  it('cork/uncork should work', async () => {
    ctx = await app.mockModuleContext();

    const helloService = await ctx.getEggObject(HelloService);
    let helloTime: number;
    // helloLogger is in child context
    mm(HelloLogger.prototype, 'handle', () => {
      helloTime = Date.now();
    });
    helloService.cork();
    const triggerTime = Date.now();
    helloService.hello();

    await sleep(100);
    helloService.uncork();

    const eventWaiter = await app.getEventWaiter();
    const helloEvent = eventWaiter.await('helloEgg');
    await helloEvent;
    assert(helloTime >= triggerTime + 100);
  });
});
