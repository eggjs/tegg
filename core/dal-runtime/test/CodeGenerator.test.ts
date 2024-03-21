import assert from 'node:assert';
import path from 'node:path';
import { Foo } from './fixtures/modules/generate_codes/Foo';
import { MultiPrimaryKey } from './fixtures/modules/generate_codes/MultiPrimaryKey';
import { TableModel } from '@eggjs/dal-decorator';
import { CodeGenerator } from '../src/CodeGenerator';

describe('test/CodeGenerator.test.ts', () => {
  it('BaseDao should work', async () => {
    const generator = new CodeGenerator({
      moduleDir: path.join(__dirname, './fixtures/modules/generate_codes'),
      moduleName: 'dal',
    });
    const fooModel = TableModel.build(Foo);
    await generator.generate(fooModel);

    const multiPrimaryKeyTableModel = TableModel.build(MultiPrimaryKey);
    await generator.generate(multiPrimaryKeyTableModel);
    assert(fooModel);
  });
});
