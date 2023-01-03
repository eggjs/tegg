import assert from 'assert';
import { EggContext } from './EggContext';

type runInContextCallback<R=any> = (context: EggContext, fn: () => Promise<R>) => Promise<R>;

export class ContextHandler {
  static getContextCallback: () => EggContext | undefined;
  static runInContextCallback: runInContextCallback;

  static getContext(): EggContext | undefined {
    return this.getContextCallback ? this.getContextCallback() : undefined;
  }

  static run<R = any>(context: EggContext, fn: () => Promise<R>): Promise<R> {
    assert(this.runInContextCallback, 'runInContextCallback not set');
    return this.runInContextCallback(context, fn);
  }
}
