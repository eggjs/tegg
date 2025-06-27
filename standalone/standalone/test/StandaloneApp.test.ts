import { strict as assert } from 'node:assert';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import mm from 'mm';
import { ModuleDescriptorDumper } from '@eggjs/tegg-metadata';
import { appMain } from '../src/main';
import { StandaloneContext } from '../src/StandaloneContext';
import { StandAloneAppTest } from './Utils';

describe('standalone/standalone/test/StandaloneApp.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  describe('simple runner', () => {
    beforeEach(() => {
      mm.restore();
      mm.spy(ModuleDescriptorDumper, 'dump');
    });

    it('should work', async () => {
      const msg: string = await StandAloneAppTest.run('simple', { dump: true });
      assert.equal(msg, 'hello!hello from ctx');
      await sleep(500);
      assert.equal((ModuleDescriptorDumper.dump as any).called, 1);
    });

    it('should not dump', async () => {
      await StandAloneAppTest.run('simple', { dump: false });
      await sleep(500);
      assert.equal((ModuleDescriptorDumper.dump as any).called, undefined);
    });
  });

  describe('StandaloneAppInit', () => {
    it('should frameworkDeps work', async () => {
      const baseDir = StandAloneAppTest.baseDir('dependency');
      const msg: string = await StandAloneAppTest.run('dependency', {
        frameworkDeps: [
          path.join(baseDir, './node_modules/dependency-1'),
        ],
      });
      assert.equal(msg, 'hello!{"features":{"dynamic":{"foo":"bar"}}}');
    });

    it('should innerObjects work', async () => {
      const obj = {
        hello() {
          return 'hello, inner';
        },
      };
      const msg: string = await StandAloneAppTest.run('inner-object', {
        innerObjects: { hello: [{ obj }] },
      });
      assert.equal(msg, 'hello, inner');
    });
  });

  describe('run', () => {
    it('should work with custom context', async () => {
      await StandAloneAppTest.copyFixture('custom-context');

      const value = 'foo' + Date.now();
      const ctx = new StandaloneContext();
      ctx.set('foo', value);

      const msg: string = await appMain(StandAloneAppTest.initOpts('custom-context'), {}, ctx);
      assert.equal(msg, value);
    });
  });

  describe('runtimeConfig', () => {
    it('should work', async () => {
      const res: object = await StandAloneAppTest.run('runtime-config', 'unittest');
      assert.deepEqual(res, {
        baseDir: StandAloneAppTest.baseDir('runtime-config'),
        name: 'runtime-config',
        env: 'unittest',
      });
    });
  });
});
