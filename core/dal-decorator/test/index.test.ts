import assert from 'node:assert';
import { Foo } from './fixtures/modules/dal/Foo';
import { ColumnInfoUtil, ColumnType, IndexInfoUtil, IndexType, TableInfoUtil } from '..';
import { TableModel } from '../src/model/TableModel';

describe('test/dal/index.test.ts', () => {
  it('decorator should work', () => {
    const columnInfoMap = ColumnInfoUtil.getColumnInfoMap(Foo);
    const columnTypeMap = ColumnInfoUtil.getColumnTypeMap(Foo);

    const indexList = IndexInfoUtil.getIndexList(Foo);

    const tableInfo = TableInfoUtil.getTableParams(Foo);
    const isTable = TableInfoUtil.getIsTable(Foo);

    assert.deepStrictEqual(columnInfoMap, new Map([
      [
        'id',
        {
          primaryKey: true,
        },
      ],
    ]));
    assert.deepStrictEqual(columnTypeMap, new Map([
      [
        'id',
        {
          type: ColumnType.INT,
        },
      ], [
        'name',
        {
          type: ColumnType.VARCHAR,
          length: 100,
        },
      ],
    ]));

    assert.deepStrictEqual(indexList, [{
      keys: [ 'name' ],
      type: IndexType.UNIQUE,
    }]);

    assert.deepStrictEqual(tableInfo, {
      comment: 'foo table',
    });

    assert.equal(isTable, true);
  });

  it('model should work', () => {
    const table = TableModel.build(Foo);
    assert(table);
    assert(table.name === 'foos');
    assert.equal(table.columns.length, 2);
    assert.equal(table.indices.length, 1);
  });
});
