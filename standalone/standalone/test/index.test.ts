import assert from 'assert';
import { main, StandaloneContext, Runner } from '..';
import path from 'path';

describe('test/index.test.ts', () => {
  describe('simple runner', () => {
    it('should work', async () => {
      const msg: string = await main(path.join(__dirname, './fixtures/simple'));
      assert(msg === 'hello!hello from ctx');
    });
  });

  describe('runner with inner object', () => {
    it('should work', async () => {
      const msg: string = await main(path.join(__dirname, './fixtures/inner-object'), {
        innerObjects: {
          hello: {
            hello: () => {
              return 'hello, inner';
            },
          },
        },
      });
      assert(msg === 'hello, inner');
    });
  });

  describe('runner with custom context', () => {
    it('should work', async () => {
      const runner = new Runner(path.join(__dirname, './fixtures/custom-context'));
      await runner.init();
      const ctx = new StandaloneContext();
      ctx.set('foo', 'foo');
      const msg = await runner.run(ctx);
      await runner.destroy();
      assert(msg === 'foo');
    });
  });
});
