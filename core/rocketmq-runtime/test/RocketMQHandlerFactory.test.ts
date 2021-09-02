import path from 'path';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import { EggContainerFactory, EggContext, LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggLoadUnitType, EggPrototype, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { RocketMQUtil } from '@eggjs/tegg-rocketmq-decorator';

import { LoaderFactory } from '../../loader';
import { RocketMQHandlerFactory } from '..';
import { SimpleListener } from './fixtures/simple-listener';

describe('test/RocketMQHandlerFactory.test.ts', () => {
  let modules: Array<LoadUnitInstance>;

  beforeEach(async () => {
    modules = await prepareModules([
      path.join(__dirname, 'fixtures/simple-listener'),
      path.join(__dirname, '..'),
    ]);
  });

  afterEach(async () => {
    for (const module of modules) {
      await LoadUnitFactory.destroyLoadUnit(module.loadUnit);
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(module);
    }
  });

  it.only('should work', async () => {
    const rocketMQHandlerFactory = await getObject(RocketMQHandlerFactory);
    rocketMQHandlerFactory.registerHandler(
      RocketMQUtil.getMessageListenerName(SimpleListener)!,
      PrototypeUtil.getClazzProto(SimpleListener) as EggPrototype,
    );
  });

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
});
