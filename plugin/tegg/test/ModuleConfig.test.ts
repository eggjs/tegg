import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/tegg/test/ModuleConfig.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/inject-module-config',
    });
    await app.ready();
  });

  it('should work', async () => {
    await app.httpRequest()
      .get('/config')
      .expect(200)
      .expect(res => {
        assert.deepStrictEqual(res.body, {
          moduleConfigs: { features: { dynamic: { foo: 'bar', bar: 'foo' } } },
          moduleConfig: { features: { dynamic: { foo: 'bar', bar: 'foo' } } },
        });
      });
  });

  it('should work with overwrite', async () => {
    await app.httpRequest()
      .get('/overwrite_config')
      .expect(200)
      .expect(res => {
        assert.deepStrictEqual(res.body, {
          moduleConfigs: { features: { dynamic: { foo: 'bar', bar: 'overwrite foo' } } },
          moduleConfig: { features: { dynamic: { foo: 'bar', bar: 'overwrite foo' } } },
        });
      });
  });
});
