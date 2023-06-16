import { Application, Context } from 'egg';
import { BackgroundTaskHelper, PrototypeUtil } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { TEggPluginContext } from '../app/extend/context';
import { getCalleeFromStack } from './Utils';

export const LONG_STACK_DELIMITER = '\n --------------------\n';

function addLongStackTrace(err: Error, causeError: Error) {
  const callSiteStack = causeError.stack;
  if (!callSiteStack || typeof callSiteStack !== 'string') {
    return;
  }
  const index = callSiteStack.indexOf('\n');
  if (index !== -1) {
    err.stack += LONG_STACK_DELIMITER + callSiteStack.substring(index + 1);
  }
}

export function hijackRunInBackground(app: Application) {
  const eggRunInBackground = app.context.runInBackground;
  app.context.runInBackground = function runInBackground(this: TEggPluginContext, scope: (ctx: Context) => Promise<any>) {
    if (!this[TEGG_CONTEXT]) {
      return Reflect.apply(eggRunInBackground, this, [ scope ]);
    }
    const caseError = new Error('cause');
    let resolveBackgroundTask;
    const backgroundTaskPromise = new Promise(resolve => {
      resolveBackgroundTask = resolve;
    });
    const newScope = async () => {
      try {
        await scope(this);
      } catch (e) {
        addLongStackTrace(e, caseError);
        throw e;
      } finally {
        resolveBackgroundTask();
      }
    };
    const taskName = (scope as any)._name || scope.name || getCalleeFromStack(true, 2);
    (scope as any)._name = taskName;
    Object.defineProperty(newScope, 'name', {
      value: taskName,
      enumerable: false,
      configurable: true,
      writable: false,
    });
    Reflect.apply(eggRunInBackground, this, [ newScope ]);

    const proto = PrototypeUtil.getClazzProto(BackgroundTaskHelper);
    const eggObject = app.eggContainerFactory.getEggObject(proto as EggPrototype);
    const backgroundTaskHelper = eggObject.obj as BackgroundTaskHelper;
    backgroundTaskHelper.run(async () => {
      await backgroundTaskPromise;
    });
  };
}
