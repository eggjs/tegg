import { ContextProto, Inject } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';
import { Graph, QueryNode } from './Tool';
import { EggContainerFactory } from '@eggjs/tegg-runtime';

@Runner()
@ContextProto()
export class Main implements MainRunner<string> {
  @Inject()
  graph: Graph;

  async main(): Promise<string> {
    // First request: set up the graph with bound execute function
    // Key: We get QueryNode ONLY on first request, not on subsequent requests
    if (!this.graph.initialized) {
      // Get QueryNode only during graph initialization (first request)
      const queryNodeObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(QueryNode);
      const queryNode = queryNodeObj.obj as QueryNode;
      this.graph.setBoundExecute(queryNode.run.bind(queryNode));
    }

    // Execute through the graph
    // On subsequent requests:
    // - Graph is reused (Singleton)
    // - boundExecute is already set, points to QueryNode from first request
    // - QueryNode.run() calls Tool.execute() which has AOP
    // - AOP needs ToolCallAdvice (ContextProto)
    // - Without the fix: ToolCallAdvice doesn't exist in current context -> ERROR
    // - With the fix: StandaloneAopContextHook pre-creates ToolCallAdvice -> SUCCESS
    return await this.graph.execute('test-input');
  }
}
