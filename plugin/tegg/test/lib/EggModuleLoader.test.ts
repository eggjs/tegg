import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';
import { Prototype } from '@eggjs/core-decorator';
import {
  GlobalGraph,
  ModuleDescriptor,
  ModuleDescriptorDumper,
} from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggModuleLoader } from '../../lib/EggModuleLoader';

class DeferredProto {
}
Prototype()(DeferredProto);

describe('test/lib/EggModuleLoader.test.ts', () => {
  beforeEach(() => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../..');
    });
  });

  afterEach(() => {
    GlobalGraph.instance = undefined;
    mm.restore();
  });

  it('should build graph synchronously by default', () => {
    const moduleDescriptor: ModuleDescriptor = {
      name: 'sync',
      unitPath: '/tmp/sync',
      clazzList: [ DeferredProto ],
      protos: [],
      multiInstanceClazzList: [],
      optional: false,
    };
    let asyncLoadCalled = false;
    mm(LoaderFactory, 'loadApp', () => [ moduleDescriptor ]);
    mm(LoaderFactory, 'loadAppAsync', async () => {
      asyncLoadCalled = true;
      return [];
    });
    mm(ModuleDescriptorDumper, 'dump', async () => undefined);

    const loader = new EggModuleLoader({
      baseDir: '/tmp/sync-app',
      config: {},
      logger: { warn: () => undefined },
      moduleReferences: [],
      plugins: {},
    } as any);

    assert.equal(GlobalGraph.instance, loader.globalGraph);
    assert.equal(loader.globalGraph.moduleGraph.nodes.size, 1);
    assert.equal(asyncLoadCalled, false);
  });

  it('should buffer build hooks until asynchronous graph initialization completes', async () => {
    let releaseLoad: () => void;
    const waitForRelease = new Promise<void>(resolve => {
      releaseLoad = resolve;
    });
    let loadCount = 0;
    let yieldIntervalMs: number | undefined;
    const moduleDescriptor: ModuleDescriptor = {
      name: 'deferred',
      unitPath: '/tmp/deferred',
      clazzList: [ DeferredProto ],
      protos: [],
      multiInstanceClazzList: [],
      optional: false,
    };

    mm(LoaderFactory, 'loadAppAsync', async (_moduleReferences, options) => {
      loadCount++;
      yieldIntervalMs = options?.yieldIntervalMs;
      await waitForRelease;
      return [ moduleDescriptor ];
    });
    mm(ModuleDescriptorDumper, 'dump', async () => undefined);

    const loader = new EggModuleLoader({
      baseDir: '/tmp/deferred-app',
      config: {
        tegg: {
          asyncLoad: true,
        },
      },
      logger: { warn: () => undefined },
      moduleReferences: [{
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      }],
      plugins: {},
    } as any);
    let hookCallCount = 0;
    loader.registerBuildHook(() => {
      hookCallCount++;
    });

    const initGraph = Promise.all([ loader.initGraph(), loader.initGraph() ]);
    assert.equal(GlobalGraph.instance, undefined);

    releaseLoad!();
    await initGraph;

    const graph = loader.globalGraph;
    assert.equal(loadCount, 1);
    assert.equal(yieldIntervalMs, 50);
    assert.equal(GlobalGraph.instance, graph);
    assert.equal(graph.moduleGraph.nodes.size, 1);
    assert.equal(hookCallCount, 0);

    graph.build();
    assert.equal(hookCallCount, 1);
  });

  it('should pass the configured asynchronous load yield interval', async () => {
    let yieldIntervalMs: number | undefined;
    const moduleDescriptor: ModuleDescriptor = {
      name: 'custom-yield-interval',
      unitPath: '/tmp/custom-yield-interval',
      clazzList: [ DeferredProto ],
      protos: [],
      multiInstanceClazzList: [],
      optional: false,
    };
    mm(LoaderFactory, 'loadAppAsync', async (_moduleReferences, options) => {
      yieldIntervalMs = options?.yieldIntervalMs;
      return [ moduleDescriptor ];
    });
    mm(ModuleDescriptorDumper, 'dump', async () => undefined);

    const loader = new EggModuleLoader({
      baseDir: '/tmp/custom-yield-interval-app',
      config: {
        tegg: {
          asyncLoad: true,
          asyncLoadYieldIntervalMs: 17,
        },
      },
      logger: { warn: () => undefined },
      moduleReferences: [{
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      }],
      plugins: {},
    } as any);

    await loader.initGraph();
    assert.equal(yieldIntervalMs, 17);
  });

  describe('has recursive dependency module', () => {
    it('should throw error', async () => {
      const app = mm.app({
        baseDir: path.join(__dirname, '../fixtures/apps/recursive-module-app'),
        framework: require.resolve('egg'),
      });
      await assert.rejects(() => app.ready(), /module has recursive deps/);
      return app.close();
    });
  });

  describe('module config in wrong order', () => {
    it('should load module success', async () => {
      const app = mm.app({
        baseDir: path.join(__dirname, '../fixtures/apps/wrong-order-app'),
        framework: require.resolve('egg'),
      });
      await app.ready();
      return app.close();
    });
  });

});
