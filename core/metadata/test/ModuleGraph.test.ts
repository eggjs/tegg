import assert from 'node:assert';
import path from 'path';
import { TestLoader } from './fixtures/TestLoader';
import { ModuleGraph } from '../src/impl/ModuleLoadUnit';

describe('test/ModuleGraph.test.ts', () => {
  it('should sort extends class success', () => {
    const modulePath = path.join(__dirname, './fixtures/modules/extends-module');
    const loader = new TestLoader(modulePath);
    const clazzList = loader.load();
    const graph = new ModuleGraph(clazzList, modulePath, 'foo');
    graph.sort();
  });

  it('should sort constructor extends class success', () => {
    const modulePath = path.join(__dirname, './fixtures/modules/extends-constructor-module');
    const loader = new TestLoader(modulePath);
    const clazzList = loader.load();
    const graph = new ModuleGraph(clazzList, modulePath, 'foo');
    graph.sort();
    assert.deepStrictEqual(graph.clazzList.map(t => t.name), [
      'Logger',
      'Bar',
      'ConstructorBase',
      'FooConstructor',
      'FooConstructorLogger',
    ]);
  });
});
