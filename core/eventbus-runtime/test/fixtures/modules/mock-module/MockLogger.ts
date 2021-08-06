import { AccessLevel, SingletonProto } from '@eggjs/core-decorator';

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
