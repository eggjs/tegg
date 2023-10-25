import { AsyncLocalStorage } from 'async_hooks';
import { EggContext } from '../../src/model/EggContext';
import { ContextHandler } from '../../src/model/ContextHandler';

export class EggContextStorage {
  static storage = new AsyncLocalStorage<EggContext>();

  static register() {
    ContextHandler.getContextCallback = () => {
      return EggContextStorage.storage.getStore();
    };
    ContextHandler.runInContextCallback = (context: EggContext, fn: () => Promise<any>) => {
      return EggContextStorage.storage.run(context, fn);
    };
  }
}
