import { strict as assert } from 'node:assert';
import path from 'node:path';
import { StandAloneAppTest } from './Utils';

describe('standalone/standalone/test/Ajv.test.ts', () => {
  afterEach(async () => {
    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should throw AjvInvalidParamError', async () => {
    await assert.rejects(
      async () =>
        await StandAloneAppTest.run('ajv-module', {
          frameworkDeps: [
            path.dirname(require.resolve('@eggjs/tegg-ajv-plugin/package.json')),
          ],
        }),
      (err: any) => {
        assert.equal(err.name, 'AjvInvalidParamError');
        assert.equal(err.message, 'Validation Failed');
        assert.deepEqual(err.errorData, {});
        assert.equal(err.currentSchema, '{"type":"object","properties":{"fullname":{"transform":["trim"],"maxLength":100,"type":"string"},"skipDependencies":{"type":"boolean"},"registryName":{"type":"string"}},"required":["fullname","skipDependencies"]}');
        assert.deepEqual(err.errors, [
          {
            instancePath: '',
            schemaPath: '#/required',
            keyword: 'required',
            params: {
              missingProperty: 'fullname',
            },
            message: "must have required property 'fullname'",
          },
        ]);
        return true;
      });
  });

  it('should pass', async () => {
    const result = await StandAloneAppTest.run<string>('ajv-module-pass', {
      frameworkDeps: [
        path.dirname(require.resolve('@eggjs/tegg-ajv-plugin/package.json')),
      ],
    });
    assert.equal(result, '{"body":{"fullname":"mock fullname","skipDependencies":true,"registryName":"ok"}}');
  });
});
