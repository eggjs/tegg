import type { GraphNodeObj } from '@eggjs/tegg-types';

const inspect = Symbol.for('nodejs.util.inspect.custom');

export class GraphNode<T extends GraphNodeObj> {
  val: T;
  toNodeMap: Map<string, GraphNode<T>> = new Map();
  fromNodeMap: Map<string, GraphNode<T>> = new Map();

  constructor(val: T) {
    this.val = val;
  }

  get id() {
    return this.val.id;
  }

  addToVertex(node: GraphNode<T>) {
    if (this.toNodeMap.has(node.id)) {
      return false;
    }
    this.toNodeMap.set(node.id, node);
    return true;
  }

  addFromVertex(node: GraphNode<T>) {
    if (this.fromNodeMap.has(node.id)) {
      return false;
    }
    this.fromNodeMap.set(node.id, node);
    return true;
  }

  [inspect]() {
    return this.toJSON();
  }

  toJSON() {
    return {
      val: this.val,
      toNodes: Array.from(this.toNodeMap.values()),
      fromNodes: Array.from(this.fromNodeMap.values()),
    };
  }

  toString() {
    return this.val.toString();
  }
}

export class GraphPath<T extends GraphNodeObj> {
  nodeIdMap: Map<string, number> = new Map();
  nodes: Array<GraphNode<T>> = [];

  pushVertex(node: GraphNode<T>): boolean {
    const val = this.nodeIdMap.get(node.id) || 0;
    this.nodeIdMap.set(node.id, val + 1);
    this.nodes.push(node);
    return val === 0;
  }

  popVertex() {
    const node = this.nodes.pop();
    if (node) {
      const val = this.nodeIdMap.get(node.id)!;
      this.nodeIdMap.set(node.id, val - 1);
    }
  }

  toString() {
    const res = this.nodes.reduce((p, c) => {
      p.push(c.val.toString());
      return p;
    }, new Array<string>());
    return res.join(' -> ');
  }

  [inspect]() {
    return this.toString();
  }
}

export class Graph<T extends GraphNodeObj> {
  nodes: Map<string, GraphNode<T>> = new Map();

  addVertex(node: GraphNode<T>): boolean {
    if (this.nodes.has(node.id)) {
      return false;
    }
    this.nodes.set(node.id, node);
    return true;
  }

  addEdge(from: GraphNode<T>, to: GraphNode<T>): boolean {
    to.addFromVertex(from);
    return from.addToVertex(to);
  }

  appendVertexToPath(node: GraphNode<T>, accessPath: GraphPath<T>): boolean {
    if (!accessPath.pushVertex(node)) {
      return false;
    }
    for (const toNode of node.toNodeMap.values()) {
      if (!this.appendVertexToPath(toNode, accessPath)) {
        return false;
      }
    }
    accessPath.popVertex();
    return true;
  }

  loopPath(): GraphPath<T> | undefined {
    const accessPath = new GraphPath<T>();
    const nodes = Array.from(this.nodes.values());
    for (const node of nodes) {
      if (!this.appendVertexToPath(node, accessPath)) {
        return accessPath;
      }
    }
    return;
  }

  accessNode(node: GraphNode<T>, nodes: Array<GraphNode<T>>, accessed: boolean[], res: Array<GraphNode<T>>) {
    const index = nodes.indexOf(node);
    if (accessed[index]) {
      return;
    }
    if (!node.toNodeMap.size) {
      accessed[nodes.indexOf(node)] = true;
      res.push(node);
      return;
    }
    for (const toNode of node.toNodeMap.values()) {
      this.accessNode(toNode, nodes, accessed, res);
    }
    accessed[nodes.indexOf(node)] = true;
    res.push(node);
  }

  // sort by direct
  // priority:
  // 1. vertex can not be access
  // 2. reverse by access direct
  //
  // notice:
  // 1. sort result is not stable
  // 2. graph with loop can not be sort
  sort(): Array<GraphNode<T>> {
    const res: Array<GraphNode<T>> = [];
    const nodes = Array.from(this.nodes.values());
    const accessed: boolean[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      accessed.push(false);
    }
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      this.accessNode(node, nodes, accessed, res);
    }
    return res;
  }
}
