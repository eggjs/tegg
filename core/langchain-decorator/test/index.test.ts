import { QualifierUtil } from '@eggjs/core-decorator';
import assert from 'node:assert';

describe('index.test.ts', () => {
  if (parseInt(process.version.slice(1, 3)) > 17) {
    it('should success', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Foo } = require('./fixtures/modules/langchain');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatModelQualifierAttribute } = require('../src');
      const chatModelQualifier = QualifierUtil.getProperQualifier(Foo, 'chatModel', ChatModelQualifierAttribute);
      assert.equal(chatModelQualifier, 'chat');
    });
  }
});
