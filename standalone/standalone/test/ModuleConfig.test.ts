import { strict as assert } from 'node:assert';
import { ModuleConfig, ModuleConfigs } from '@eggjs/tegg/helper';
import { StandAloneAppTest } from './Utils';

describe('standalone/standalone/test/ModuleConfig.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should work', async () => {
    const config: object = await StandAloneAppTest.run('module-with-config');
    assert.deepEqual(config, {
      features: {
        dynamic: {
          foo: 'bar',
        },
      },
    });
  });

  it('should work with env', async () => {
    const config: object = await StandAloneAppTest.run('module-with-env-config', 'dev');
    assert.deepEqual(config, {
      features: {
        dynamic: {
          foo: 'foo',
        },
      },
    });
  });

  describe('@ConfigSourceQualifier', () => {
    type ConfigResult = {
      configs: ModuleConfigs,
      foo: ModuleConfig,
      bar: ModuleConfig,
      configFromBar: ModuleConfig,
    };

    it('should set by default', async () => {
      const { configs, foo, configFromBar } = await StandAloneAppTest.run<ConfigResult>('multi-modules');

      assert.deepEqual(foo, {
        features: {
          dynamic: {
            foo: 'bar',
          },
        },
      });
      assert.deepEqual(configFromBar, {
        features: {
          dynamic: {
            bar: 'bar',
          },
        },
      });
      assert.deepEqual(configs.get('foo'), foo);
      assert.deepEqual(configs.get('bar'), configFromBar);
    });

    it('should use @ConfigSourceQualifier manually work', async () => {
      const { configs, bar } = await StandAloneAppTest.run<any>('multi-modules');
      assert.deepEqual(bar, {
        features: {
          dynamic: {
            bar: 'bar',
          },
        },
      });
      assert.deepEqual(configs.get('bar'), bar);
    });
  });
});
