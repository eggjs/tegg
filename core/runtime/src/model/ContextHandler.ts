import assert from 'assert';
import { EggContext } from './EggContext';

type runInContextCallback<R=any> = (context: EggContext, fn: () => Promise<R>) => Promise<R>;

export class ContextHandler {
  static getContextCallback: () => EggContext | undefined;
  static runInContextCallback: runInContextCallback;

  static getContext(): EggContext | undefined {
    assert(this.getContextCallback, 'getContextCallback not set');
    return this.getContextCallback();
  }

  static run<R = any>(context: EggContext, fn: () => Promise<R>): Promise<R> {
    assert(this.runInContextCallback, 'runInContextCallback not set');
    return this.runInContextCallback(context, fn);
  }
}
