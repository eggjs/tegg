import { SingletonProto, Inject } from '@eggjs/tegg';
import {
  Advice,
  AdviceContext,
  IAdvice,
  Pointcut,
} from '@eggjs/tegg/aop';

/**
 * This is a ContextProto Advice (default for @Advice decorator)
 * This simulates the user's CachedToolCallAdvice scenario
 */
@Advice()
export class ToolCallAdvice implements IAdvice<Tool> {
  private callCount = 0;

  async beforeCall(ctx: AdviceContext<Tool>): Promise<void> {
    this.callCount++;
    ctx.args[0] = `[advised:${this.callCount}] ${ctx.args[0]}`;
  }
}

/**
 * This is a SingletonProto that uses a ContextProto Advice
 * This is the exact scenario that causes "EggObject not found" error
 */
@SingletonProto()
export class Tool {
  @Pointcut(ToolCallAdvice)
  async execute(input: string): Promise<string> {
    return `Tool executed: ${input}`;
  }
}

/**
 * A SingletonProto that uses another SingletonProto Tool
 * IMPORTANT: Both are Singletons, so in subsequent requests:
 * - QueryNode is not re-created
 * - Tool is not re-fetched via getOrCreateEggObject
 * - ContextInitiator.init(Tool) is NOT called
 * - Tool's ContextProto Advice is NOT created
 * - AOP fails with "EggObject not found"
 */
@SingletonProto()
export class QueryNode {
  @Inject()
  tool: Tool;

  async run(input: string): Promise<string> {
    // This calls tool.execute() which has AOP
    return await this.tool.execute(input);
  }
}

/**
 * A singleton that stores bound functions (simulates langchain graph)
 * This is the key scenario that causes the bug:
 * 1. Graph is created in request A, stores bound function nodeObj.execute.bind(nodeObj)
 * 2. Request A ends, ContextProto Advice is destroyed
 * 3. Request B uses the Graph, calls the stored bound function
 * 4. The bound function's `this` (nodeObj) has a Tool that uses ContextProto Advice
 * 5. AOP tries to access Advice, but it doesn't exist in request B's context
 */
@SingletonProto()
export class Graph {
  private boundExecute: ((input: string) => Promise<string>) | null = null;
  private _initialized = false;

  get initialized(): boolean {
    return this._initialized;
  }

  // Simulate langchain's addNode - stores bound function ONLY ONCE
  setBoundExecute(fn: (input: string) => Promise<string>) {
    if (!this._initialized) {
      this.boundExecute = fn;
      this._initialized = true;
    }
  }

  async execute(input: string): Promise<string> {
    if (!this.boundExecute) {
      throw new Error('boundExecute not set');
    }
    return await this.boundExecute(input);
  }
}
