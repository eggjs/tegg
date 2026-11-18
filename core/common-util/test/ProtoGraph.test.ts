import assert from 'node:assert';
import type { GraphNodeObj } from '@eggjs/tegg-types';
import { GraphNode, Graph } from '../src/Graph';

describe('test/LoadUnit/Graph.test.ts', () => {
  class GraphNodeVal implements GraphNodeObj {
    id: string;

    constructor(id: string) {
      this.id = id;
    }

    toString() {
      return `id:${this.id}`;
    }
  }

  describe('hasLoop', () => {
    it('if has loop, should return path', () => {
      const graph = new Graph();
      const node1 = new GraphNode(new GraphNodeVal('1'));
      const node2 = new GraphNode(new GraphNodeVal('2'));
      const node3 = new GraphNode(new GraphNodeVal('3'));
      const node4 = new GraphNode(new GraphNodeVal('4'));
      const node5 = new GraphNode(new GraphNodeVal('5'));
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addVertex(node1);
      graph.addVertex(node4);
      graph.addVertex(node5);

      graph.addEdge(node1, node5);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node3);
      graph.addEdge(node3, node1);

      const loopPath = graph.loopPath();
      assert(loopPath!.toString() === 'id:2 -> id:3 -> id:1 -> id:2');
    });

    it('if do not has loop, should return undefined', () => {
      const graph = new Graph();
      const node1 = new GraphNode({ id: '1' });
      const node2 = new GraphNode({ id: '2' });
      const node3 = new GraphNode({ id: '3' });
      const node4 = new GraphNode({ id: '4' });
      const node5 = new GraphNode({ id: '5' });
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addVertex(node1);
      graph.addVertex(node4);
      graph.addVertex(node5);

      graph.addEdge(node1, node5);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node3);
      graph.addEdge(node3, node4);

      const loopPath = graph.loopPath();
      assert(!loopPath);
    });

    it('should expand a shared dependency only once per cycle check', () => {
      const graph = new Graph();
      const root = new GraphNode(new GraphNodeVal('root'));
      const left = new GraphNode(new GraphNodeVal('left'));
      const right = new GraphNode(new GraphNodeVal('right'));
      const shared = new GraphNode(new GraphNodeVal('shared'));
      const leaf = new GraphNode(new GraphNodeVal('leaf'));
      for (const node of [ root, left, right, shared, leaf ]) {
        graph.addVertex(node);
      }
      graph.addEdge(root, left);
      graph.addEdge(root, right);
      graph.addEdge(left, shared);
      graph.addEdge(right, shared);
      graph.addEdge(shared, leaf);

      let expansions = 0;
      const edges = shared.toNodeMap.values.bind(shared.toNodeMap);
      shared.toNodeMap.values = () => {
        expansions++;
        return edges();
      };

      assert.strictEqual(graph.loopPath(), undefined);
      assert.strictEqual(expansions, 1);
    });

    it('should check distinct nodes with the same ID for cycles', () => {
      const graph = new Graph();
      const a = new GraphNode(new GraphNodeVal('a'));
      const b = new GraphNode(new GraphNodeVal('b'));
      const x1 = new GraphNode(new GraphNodeVal('x'));
      const x2 = new GraphNode(new GraphNodeVal('x'));
      for (const node of [ a, b, x2 ]) {
        graph.addVertex(node);
      }
      graph.addEdge(a, x1);
      graph.addEdge(b, x2);
      graph.addEdge(x2, b);

      const loopPath = graph.loopPath();
      assert(loopPath);
      assert.deepStrictEqual(loopPath.nodes.map(entry => entry.node), [ b, x2, b ]);
    });

    it('should detect a repeated ID through a previously checked subgraph', () => {
      const graph = new Graph();
      const shared = new GraphNode(new GraphNodeVal('shared'));
      const x1 = new GraphNode(new GraphNodeVal('x'));
      const x2 = new GraphNode(new GraphNodeVal('x'));
      graph.addVertex(shared);
      graph.addVertex(x2);
      graph.addEdge(shared, x1);
      graph.addEdge(x2, shared);

      const loopPath = graph.loopPath();
      assert(loopPath);
      assert.deepStrictEqual(loopPath.nodes.map(entry => entry.node), [ x2, shared, x1 ]);
    });

    it('should report a newly added cycle with its incoming path and edge metadata', () => {
      const graph = new Graph();
      const root = new GraphNode(new GraphNodeVal('root'));
      const first = new GraphNode(new GraphNodeVal('first'));
      const second = new GraphNode(new GraphNodeVal('second'));
      for (const node of [ root, first, second ]) {
        graph.addVertex(node);
      }
      graph.addEdge(root, first);
      graph.addEdge(first, second);
      assert.strictEqual(graph.loopPath(), undefined);

      const backEdge = {
        equal: () => false,
        toString: () => 'back edge',
      };
      graph.addEdge(second, first, backEdge);

      const loopPath = graph.loopPath();
      assert(loopPath);
      assert.deepStrictEqual(loopPath.nodes.map(entry => entry.node), [ root, first, second, first ]);
      assert.strictEqual(loopPath.nodes[3].meta, backEdge);
    });
  });

  describe('sort', () => {
    it('can not access vertex should at first', () => {
      const graph = new Graph();
      const node1 = new GraphNode({ id: '1' });
      const node2 = new GraphNode({ id: '2' });
      const node3 = new GraphNode({ id: '3' });
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addEdge(node2, node3);
      const sortRes = graph.sort();
      assert(sortRes[0] === node1);
    });

    it('should have reverse order with access direct', () => {
      const graph = new Graph();
      const node1 = new GraphNode({ id: '1' });
      const node2 = new GraphNode({ id: '2' });
      const node3 = new GraphNode({ id: '3' });
      const node4 = new GraphNode({ id: '4' });
      const node5 = new GraphNode({ id: '5' });
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addVertex(node4);
      graph.addVertex(node5);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node5);
      graph.addEdge(node3, node4);
      graph.addEdge(node4, node5);
      const sortRes = graph.sort();
      assert.deepStrictEqual(sortRes, [
        node5,
        node2,
        node1,
        node4,
        node3,
      ]);
    });
  });
});
