import path from 'path';
import mm from 'mm';
import { EggContainerFactory, EggContext, LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggLoadUnitType, EggPrototype, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { HelloHandler, HelloProducer } from './fixtures/modules/event/HelloEvent';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import { LoaderFactory } from '../../loader';
import { EggTestContext } from '../../test-util';
import { EventContextFactory, EventHandlerFactory, SingletonEventBus } from '..';
import { EventInfoUtil, CORK_ID } from '@eggjs/eventbus-decorator';
import assert from 'assert';
import { Timeout0Handler, Timeout100Handler, TimeoutProducer } from './fixtures/modules/event/MultiEvent';
import sleep from 'mz-modules/sleep';

describe('test/EventBus.test.ts', () => {
  async function getLoadUnitInstance(moduleDir: string): Promise<LoadUnitInstance> {
    const loader = LoaderFactory.createLoader(moduleDir, EggLoadUnitType.MODULE);
    const loadUnit = await LoadUnitFactory.createLoadUnit(moduleDir, EggLoadUnitType.MODULE, loader);
    return await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
  }

  async function prepareModules(moduleDirs: string[]): Promise<Array<LoadUnitInstance>> {
    const instances: Array<LoadUnitInstance> = [];
    for (const moduleDir of moduleDirs) {
      instances.push(await getLoadUnitInstance(moduleDir));
    }
    return instances;
  }

  async function getObject<T>(clazz: EggProtoImplClass<T>, ctx?: EggContext): Promise<T> {
    const proto = PrototypeUtil.getClazzProto(clazz as any) as EggPrototype;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(proto, proto.name, ctx);
    return eggObj.obj as unknown as T;
  }

  let modules: Array<LoadUnitInstance>;
  beforeEach(async () => {
    modules = await prepareModules([
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
    const ctx = new EggTestContext();
    const eventContextFactory = await getObject(EventContextFactory);
    eventContextFactory.registerContextCreator(() => {
      return ctx;
    });
    const eventHandlerFactory = await getObject(EventHandlerFactory);
    eventHandlerFactory.registerHandler(
      EventInfoUtil.getEventName(HelloHandler)!,
      PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

    const eventBus = await getObject(SingletonEventBus);
    const helloProducer = await getObject(HelloProducer);
    const helloHandler = await getObject(HelloHandler, ctx);
    const helloEvent = eventBus.await('hello');
    let msg: string | undefined;
    mm(helloHandler, 'handle', async m => {
      msg = m;
    });
    helloProducer.trigger();

    await helloEvent;
    assert(msg === '01');
    assert(msg);
  });

  it('destroy should be called', async () => {
    const ctx = new EggTestContext();
    let destroyCalled = false;
    mm(ctx, 'destroy', async () => {
      destroyCalled = true;
    });
    const eventContextFactory = await getObject(EventContextFactory);
    eventContextFactory.registerContextCreator(() => {
      return ctx;
    });
    const eventHandlerFactory = await getObject(EventHandlerFactory);
    eventHandlerFactory.registerHandler(
      EventInfoUtil.getEventName(HelloHandler)!,
      PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

    const eventBus = await getObject(SingletonEventBus);
    const helloProducer = await getObject(HelloProducer);
    const helloEvent = eventBus.await('hello');

    helloProducer.trigger();

    await helloEvent;
    assert(destroyCalled === true);
  });

  it('should wait all handler done', async () => {
    const ctx = new EggTestContext();
    const eventContextFactory = await getObject(EventContextFactory);
    eventContextFactory.registerContextCreator(() => {
      return ctx;
    });
    const eventHandlerFactory = await getObject(EventHandlerFactory);
    eventHandlerFactory.registerHandler(
      EventInfoUtil.getEventName(Timeout0Handler)!,
      PrototypeUtil.getClazzProto(Timeout0Handler) as EggPrototype);
    eventHandlerFactory.registerHandler(
      EventInfoUtil.getEventName(Timeout100Handler)!,
      PrototypeUtil.getClazzProto(Timeout100Handler) as EggPrototype);

    const eventBus = await getObject(SingletonEventBus);
    const timeoutProducer = await getObject(TimeoutProducer);
    const timeoutEvent = eventBus.await('timeout');
    timeoutProducer.trigger();

    await timeoutEvent;
    assert(Timeout100Handler.called === true);
  });

  it('cork should work', async () => {
    const ctx = new EggTestContext();
    const eventContextFactory = await getObject(EventContextFactory);
    eventContextFactory.registerContextCreator(() => {
      return ctx;
    });
    const eventHandlerFactory = await getObject(EventHandlerFactory);
    eventHandlerFactory.registerHandler(
      EventInfoUtil.getEventName(HelloHandler)!,
      PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

    const eventBus = await getObject(SingletonEventBus);
    const corkId = eventBus.generateCorkId();
    ctx.set(CORK_ID, corkId);
    eventBus.cork(corkId);

    const helloHandler = await getObject(HelloHandler, ctx);
    const helloEvent = eventBus.await('hello');
    let eventTime: number;
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

  it('multi cork should work', async () => {
    const ctx = new EggTestContext();
    const eventContextFactory = await getObject(EventContextFactory);
    eventContextFactory.registerContextCreator(() => {
      return ctx;
    });
    const eventHandlerFactory = await getObject(EventHandlerFactory);
    eventHandlerFactory.registerHandler(
      EventInfoUtil.getEventName(HelloHandler)!,
      PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype);

    const eventBus = await getObject(SingletonEventBus);
    const corkId = eventBus.generateCorkId();
    ctx.set(CORK_ID, corkId);
    eventBus.cork(corkId);
    eventBus.cork(corkId);

    const helloHandler = await getObject(HelloHandler, ctx);
    const helloEvent = eventBus.await('hello');
    let eventTime: number;
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
