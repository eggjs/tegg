import assert from 'assert';
import path from 'path';
import { AppGraph, ModuleNode } from '../src/model/AppGraph';
import { RootProto } from './fixtures/modules/app-graph-modules/root/Root';
import { UsedProto } from './fixtures/modules/app-graph-modules/used/Used';
import { UnusedProto } from './fixtures/modules/app-graph-modules/unused/Unused';

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
});
