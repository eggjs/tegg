import path from 'node:path';
import coffee from 'coffee';

describe('test/typing.test.ts', () => {
  it('should check enum value', async () => {
    const tsc = require.resolve('typescript/bin/tsc');
    await coffee.fork(tsc, [ '--noEmit', '-p', './tsconfig.json' ], {
      cwd: path.join(__dirname, 'fixtures/modules/wrong-enum-module'),
    })
      .debug()
      .expect('stdout', /Argument of type '"WRONG_ENUM"' is not assignable to parameter of type 'ContextHelloType'/)
      .notExpect('code', 0)
      .end();
  });

  it('should check extends', async () => {
    const tsc = require.resolve('typescript/bin/tsc');
    await coffee.fork(tsc, [ '--noEmit', '-p', './tsconfig.json' ], {
      cwd: path.join(__dirname, 'fixtures/modules/wrong-extends-module'),
    })
      .debug()
      .expect('stdout', / Property 'hello' is missing in type 'BarContextHello' but required in type 'AbstractContextHello'/)
      .notExpect('code', 0)
      .end();
  });
});
