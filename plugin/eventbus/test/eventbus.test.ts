import assert from 'node:assert/strict';
import path from 'node:path';
import mm, { MockApplication } from 'egg-mock';
import { TimerUtil } from '@eggjs/tegg-common-util';
import { HelloService } from './fixtures/apps/event-app/app/event-module/HelloService';
import { HelloLogger } from './fixtures/apps/event-app/app/event-module/HelloLogger';
import { MultiEventHandler } from './fixtures/apps/event-app/app/event-module/MultiEventHandler';

describe('plugin/eventbus/test/eventbus.test.ts', () => {
  let app: MockApplication;

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
    await app.mockModuleContextScope(async ctx => {
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
  });

  it('cork/uncork should work', async () => {
    await app.mockModuleContextScope(async ctx => {
      const helloService = await ctx.getEggObject(HelloService);
      let helloTime = 0;
      // helloLogger is in child context
      mm(HelloLogger.prototype, 'handle', () => {
        helloTime = Date.now();
      });
      helloService.cork();
      const triggerTime = Date.now();
      helloService.hello();

      await TimerUtil.sleep(100);
      helloService.uncork();

      const eventWaiter = await app.getEventWaiter();
      const helloEvent = eventWaiter.await('helloEgg');
      await helloEvent;
      assert(helloTime >= triggerTime + 100);
    });
  });

  it('can call cork/uncork multi times', async () => {
    await app.mockModuleContextScope(async ctx => {
      const helloService = await ctx.getEggObject(HelloService);
      const eventWaiter = await app.getEventWaiter();

      let helloCalled = 0;
      // helloLogger is in child context
      mm(HelloLogger.prototype, 'handle', () => {
        helloCalled++;
      });
      helloService.cork();
      helloService.hello();
      helloService.uncork();
      await eventWaiter.await('helloEgg');

      helloService.cork();
      helloService.hello();
      helloService.uncork();
      await eventWaiter.await('helloEgg');

      assert(helloCalled === 2);
    });
  });

  it('reentry cork/uncork should work', async () => {
    await app.mockModuleContextScope(async ctx => {
      const helloService = await ctx.getEggObject(HelloService);
      const eventWaiter = await app.getEventWaiter();

      let helloCalled = 0;
      // helloLogger is in child context
      mm(HelloLogger.prototype, 'handle', () => {
        helloCalled++;
      });
      helloService.cork();
      helloService.cork();
      helloService.hello();
      helloService.uncork();
      helloService.uncork();
      await eventWaiter.await('helloEgg');

      assert(helloCalled === 1);
    });
  });

  it('concurrent cork/uncork should work', async () => {
    let helloCalled = 0;
    // helloLogger is in child context
    mm(HelloLogger.prototype, 'handle', () => {
      helloCalled++;
    });
    await Promise.all([
      app.mockModuleContextScope(async ctx => {
        const helloService = await ctx.getEggObject(HelloService);
        const eventWaiter = await app.getEventWaiter();
        helloService.cork();
        helloService.hello();
        await TimerUtil.sleep(100);
        helloService.uncork();
        await eventWaiter.await('helloEgg');
      }),
      app.mockModuleContextScope(async ctx => {
        const helloService = await ctx.getEggObject(HelloService);
        const eventWaiter = await app.getEventWaiter();
        helloService.cork();
        helloService.hello();
        await TimerUtil.sleep(100);
        helloService.uncork();
        await eventWaiter.await('helloEgg');
      }),
    ]);
    assert(helloCalled === 2);
  });

  it('multi event handler should work', async function() {
    await app.mockModuleContextScope(async ctx => {
      const helloService = await ctx.getEggObject(HelloService);
      let eventName = '';
      let msg = '';
      mm(MultiEventHandler.prototype, 'handle', (ctx, m) => {
        eventName = ctx.eventName;
        msg = m;
      });
      const eventWaiter = await app.getEventWaiter();
      const helloEvent = eventWaiter.await('helloEgg');
      helloService.hello();
      await helloEvent;
      assert.equal(eventName, 'helloEgg');
      assert.equal(msg, '01');
      const hiEvent = eventWaiter.await('hiEgg');
      helloService.hi();
      await hiEvent;
      assert.equal(eventName, 'hiEgg');
      assert.equal(msg, 'Ydream');
    });
  });
});
