import { AccessLevel, ContextProto, SingletonProto } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'logger',
})
export class MockLogger {
  constructor() {
    const methods = Object.keys(console);
    for (const method of methods) {
      this[method] = (...args) => {
        console[method](...args);
      }
    }
  }
}


@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'logger',
})
export class MockContextLogger {
  constructor() {
    const methods = Object.keys(console);
    for (const method of methods) {
      this[method] = (...args) => {
        console[method](...args);
      }
    }
  }
}
