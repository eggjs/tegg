/**
 * Capture call site stack from v8.
 * https://github.com/v8/v8/wiki/Stack-Trace-API
 */

function prepareObjectStackTrace(_, stack) {
  return stack;
}

export class StackUtil {
  // from egg-core/utils
  // https://github.com/eggjs/egg-core/blob/master/lib/utils/index.js#L51
  static getCalleeFromStack(withLine: boolean, stackIndex?: number) {
    stackIndex = stackIndex === undefined ? 2 : stackIndex;
    const limit = Error.stackTraceLimit;
    const prep = Error.prepareStackTrace;

    Error.prepareStackTrace = prepareObjectStackTrace;
    Error.stackTraceLimit = 10;

    // capture the stack
    const obj: { stack: NodeJS.CallSite[] } = {
      stack: [],
    };
    Error.captureStackTrace(obj);
    const callSite = obj.stack[stackIndex];
    let fileName;
    /* istanbul ignore else */
    if (callSite) {
      // egg-mock will create a proxy
      // https://github.com/eggjs/egg-mock/blob/master/lib/app.js#L174
      fileName = callSite.getFileName();
    }

    Error.prepareStackTrace = prep;
    Error.stackTraceLimit = limit;

    /* istanbul ignore if */
    if (!callSite || !fileName) return '<anonymous>';
    if (!withLine) return fileName;
    return `${fileName}:${callSite.getLineNumber()}:${callSite.getColumnNumber()}`;
  }
}
