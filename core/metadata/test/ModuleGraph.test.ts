import path from 'path';
import { TestLoader } from './fixtures/TestLoader';
import { ModuleGraph } from '../src/impl/ModuleLoadUnit';

describe('test/ModuleGraph.test.ts', () => {
  it('should sort extends class success', () => {
    const modulePath = path.join(__dirname, './fixtures/modules/extends-module');
    const loader = new TestLoader(modulePath);
    const clazzList = loader.load();
    const graph = new ModuleGraph(clazzList);
    graph.sort();
  });
});
