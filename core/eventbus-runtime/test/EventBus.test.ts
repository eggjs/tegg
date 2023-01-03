import path from 'path';
import mm from 'mm';
import { LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggPrototype, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { HelloHandler, HelloProducer } from './fixtures/modules/event/HelloEvent';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { EventContextFactory, EventHandlerFactory, SingletonEventBus } from '..';
import { EventInfoUtil, CORK_ID } from '@eggjs/eventbus-decorator';
import assert from 'assert';
import { Timeout0Handler, Timeout100Handler, TimeoutProducer } from './fixtures/modules/event/MultiEvent';
import sleep from 'mz-modules/sleep';
import { CoreTestHelper, EggTestContext } from '@eggjs/module-test-util';

describe('test/EventBus.test.ts', () => {
  let modules: Array<LoadUnitInstance>;
  beforeEach(async () => {
    modules = await CoreTestHelper.prepareModules([
      path.join(__dirname, 'fixtures/modules/mock-module'),
      path.join(__dirname, '..'),
      path.join(__dirname, 'fixtures/modules/event'),
    ]);
  });

  afterEach(async () => {
    for (const module of modules) {
      await LoadUnitFactory.destroyLoadUnit(module.loadUnit);
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(module);
    }
  });

  it('should work', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const helloProducer = await CoreTestHelper.getObject(HelloProducer);
      const helloHandler = await CoreTestHelper.getObject(HelloHandler);
      const helloEvent = eventBus.await('hello');
      let msg: string | undefined;
      mm(helloHandler, 'handle', async m => {
        msg = m;
      });
      helloProducer.trigger();

      await helloEvent;
      assert(msg === '01');
    });
  });

  it('destroy should be called', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      let destroyCalled = false;
      mm(ctx, 'destroy', async () => {
        destroyCalled = true;
      });
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const helloProducer = await CoreTestHelper.getObject(HelloProducer);
      const helloEvent = eventBus.await('hello');

      helloProducer.trigger();

      await helloEvent;
      assert(destroyCalled);
    });
  });

  it('should wait all handler done', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(Timeout0Handler)!,
        PrototypeUtil.getClazzProto(Timeout0Handler) as EggPrototype);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(Timeout100Handler)!,
        PrototypeUtil.getClazzProto(Timeout100Handler) as EggPrototype);

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const timeoutProducer = await CoreTestHelper.getObject(TimeoutProducer);
      const timeoutEvent = eventBus.await('timeout');
      timeoutProducer.trigger();

      await timeoutEvent;
      assert(Timeout100Handler.called);
    });
  });

  it('cork should work', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const corkId = eventBus.generateCorkId();
      ctx.set(CORK_ID, corkId);
      eventBus.cork(corkId);

      const helloHandler = await CoreTestHelper.getObject(HelloHandler);
      const helloEvent = eventBus.await('hello');
      let eventTime = 0;
      mm(helloHandler, 'handle', async () => {
        eventTime = Date.now();
      });
      eventBus.emitWithContext(ctx, 'hello', [ '01' ]);
      const triggerTime = Date.now();

      await sleep(100);
      eventBus.uncork(corkId);
      await helloEvent;
      assert(eventTime >= triggerTime + 100);
    });
  });

  it('multi cork should work', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const corkId = eventBus.generateCorkId();
      ctx.set(CORK_ID, corkId);
      eventBus.cork(corkId);
      eventBus.cork(corkId);

      const helloHandler = await CoreTestHelper.getObject(HelloHandler);
      const helloEvent = eventBus.await('hello');
      let eventTime = 0;
      mm(helloHandler, 'handle', async () => {
        eventTime = Date.now();
      });
      eventBus.emitWithContext(ctx, 'hello', [ '01' ]);
      const triggerTime = Date.now();

      await sleep(100);
      eventBus.uncork(corkId);
      await sleep(100);
      eventBus.uncork(corkId);

      await helloEvent;
      assert(eventTime >= triggerTime + 200);
    });
  });
});
