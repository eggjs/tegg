import assert from 'assert';
import { main, StandaloneContext, Runner } from '..';
import path from 'path';
import { ModuleConfigs } from '../src/ModuleConfigs';
import { ModuleConfig } from 'egg';

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
        innerObjectHandlers: {
          hello: [{
            obj: {
              hello() {
                return 'hello, inner';
              },
            },
          }],
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

  describe('module with config', () => {
    it('should work', async () => {
      const config = await main(path.join(__dirname, './fixtures/module-with-config'));
      assert.deepStrictEqual(config, {
        features: {
          dynamic: {
            foo: 'bar',
          },
        },
      });
    });
  });

  describe('@ConfigSource qualifier', () => {
    it('should work', async () => {
      const { configs, foo, bar } = (await main(path.join(__dirname, './fixtures/multi-modules'))) as {
        configs: ModuleConfigs,
        foo: ModuleConfig,
        bar: ModuleConfig,
      };
      assert.deepStrictEqual(configs.get('foo'), foo);
      assert.deepStrictEqual(configs.get('bar'), bar);
    });
  });

  describe('runner with runtimeConfig', () => {
    it('should work', async () => {
      const msg = await main(path.join(__dirname, './fixtures/runtime-config'));
      assert.deepEqual(msg, { baseDir: path.join(__dirname, './fixtures/runtime-config') });
    });
  });

});
