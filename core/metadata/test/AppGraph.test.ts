import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'vitest';
import { AppGraph, ModuleNode } from '../src/index.js';
import { RootProto } from './fixtures/modules/app-graph-modules/root/Root.js';
import { UsedProto } from './fixtures/modules/app-graph-modules/used/Used.js';
import { UnusedProto } from './fixtures/modules/app-graph-modules/unused/Unused.js';
import { App } from './fixtures/modules/app-multi-inject-multi/app/modules/app/App.js';
import { BizManager } from './fixtures/modules/app-multi-inject-multi/app/modules/bar/BizManager.js';
import { Secret } from './fixtures/modules/app-multi-inject-multi/app/modules/foo/Secret.js';
import { App2 } from './fixtures/modules/app-multi-inject-multi/app/modules/app2/App.js';

describe('test/LoadUnit/AppGraph.test.ts', () => {
  it('optional module dep should work', () => {
    const graph = new AppGraph();
    const rootModuleNode = new ModuleNode({
      name: 'foo',
      path: path.join(__dirname, './fixtures/modules/app-graph-modules/root'),
    });
    rootModuleNode.addClazz(RootProto);
    graph.addNode(rootModuleNode);
    const usedOptionalModuleNode = new ModuleNode({
      name: 'usedOptionalModuleNode',
      path: path.join(__dirname, './fixtures/modules/app-graph-modules/used'),
      optional: true,
    });
    usedOptionalModuleNode.addClazz(UsedProto);
    graph.addNode(usedOptionalModuleNode);
    const unusedOptionalModuleNode = new ModuleNode({
      name: 'unusedOptionalModuleNode',
      path: path.join(__dirname, './fixtures/modules/app-graph-modules/unused'),
      optional: true,
    });
    unusedOptionalModuleNode.addClazz(UnusedProto);
    graph.addNode(unusedOptionalModuleNode);
    graph.build();
    graph.sort();
    assert(graph.moduleConfigList.length === 2);
  });

  it('multi instance inject multi instance should work', () => {
    const graph = new AppGraph();
    const appModuleNode = new ModuleNode({
      name: 'app',
      path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app'),
    });
    appModuleNode.addClazz(App);
    graph.addNode(appModuleNode);

    const app2ModuleNode = new ModuleNode({
      name: 'app2',
      path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app2'),
    });
    app2ModuleNode.addClazz(App2);
    graph.addNode(app2ModuleNode);

    const barOptionalModuleNode = new ModuleNode({
      name: 'bar',
      path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/bar'),
    });
    barOptionalModuleNode.addClazz(BizManager);
    graph.addNode(barOptionalModuleNode);
    const fooOptionalModuleNode = new ModuleNode({
      name: 'foo',
      path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/foo'),
    });
    fooOptionalModuleNode.addClazz(Secret);
    graph.addNode(fooOptionalModuleNode);
    graph.build();
    graph.sort();
    assert.deepStrictEqual(graph.moduleConfigList.map(t => t.name), [
      'app',
      'app2',
      'bar',
      'foo',
    ]);
  });
});
