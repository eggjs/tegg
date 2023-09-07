import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { main, StandaloneContext, Runner } from '..';
import { ModuleConfigs } from '../src/ModuleConfigs';
import { ModuleConfig } from 'egg';
import { crosscutAdviceParams, pointcutAdviceParams } from './fixtures/aop-module/Hello';

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

    it('should work with env', async () => {
      const config = await main(path.join(__dirname, './fixtures/module-with-env-config'), {
        env: 'dev',
      });
      assert.deepStrictEqual(config, {
        features: {
          dynamic: {
            foo: 'foo',
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

  describe('multi instance prototype runner', () => {
    const fixturePath = path.join(__dirname, './fixtures/multi-callback-instance-module');
    afterEach(async () => {
      await fs.unlink(path.join(fixturePath, 'main', 'foo.log'));
      await fs.unlink(path.join(fixturePath, 'main', 'bar.log'));
      await fs.unlink(path.join(fixturePath, 'biz', 'fooBiz.log'));
      await fs.unlink(path.join(fixturePath, 'biz', 'barBiz.log'));
    });

    it('should work', async () => {
      await main(fixturePath);
      const fooContent = await fs.readFile(path.join(fixturePath, 'main', 'foo.log'), 'utf8');
      const barContent = await fs.readFile(path.join(fixturePath, 'main', 'bar.log'), 'utf8');
      assert(fooContent.includes('hello, foo'));
      assert(barContent.includes('hello, bar'));

      const fooBizContent = await fs.readFile(path.join(fixturePath, 'biz', 'fooBiz.log'), 'utf8');
      const barBizContent = await fs.readFile(path.join(fixturePath, 'biz', 'barBiz.log'), 'utf8');
      assert(fooBizContent.includes('hello, foo biz'));
      assert(barBizContent.includes('hello, bar biz'));
    });
  });

  describe('dynamic inject', () => {
    const fixturePath = path.join(__dirname, './fixtures/dynamic-inject-module');

    it('should work', async () => {
      const msgs = await main(fixturePath);
      assert.deepStrictEqual(msgs, [
        'hello, foo(context:0)',
        'hello, bar(context:0)',
        'hello, foo(singleton:0)',
        'hello, bar(singleton:0)',
      ]);
    });
  });

  describe('aop runtime', () => {
    const fixturePath = path.join(__dirname, './fixtures/aop-module');

    it('should work', async () => {
      const msg = await main(fixturePath);
      assert.deepStrictEqual(msg,
        `withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))${JSON.stringify(pointcutAdviceParams)})${JSON.stringify(crosscutAdviceParams)})`);
    });
  });
});
