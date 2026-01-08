import assert from 'node:assert';
import path from 'node:path';
import mm from 'mm';
import { RDSClient } from '@eggjs/rds';
import { DeleteResult, InsertResult, UpdateResult } from '@eggjs/rds/lib/types';
import { TableModel } from '@eggjs/dal-decorator';
import { MysqlDataSource } from '../src/MySqlDataSource';
import { SqlMapLoader } from '../src/SqlMapLoader';
import { Foo } from './fixtures/modules/dal/Foo';
import { DataSource } from '../src/DataSource';
import { TableModelInstanceBuilder } from '../src/TableModelInstanceBuilder';
import { DatabaseForker } from '../src/DatabaseForker';
import { BaseFooDAO } from './fixtures/modules/dal/dal/dao/base/BaseFooDAO';

describe('test/Datasource.test.ts', () => {
  const mysqlOptions = {
    name: 'foo',
    host: '127.0.0.1',
    user: 'root',
    database: 'test_runtime',
    timezone: '+08:00',
    initSql: 'SET GLOBAL time_zone = \'+08:00\';',
    forkDb: true,
  };

  describe('init', () => {
    afterEach(() => {
      mm.restore();
    });

    it('init failed should throw error', async () => {
      mm.errorOnce(RDSClient.prototype, 'query', new Error('fake error'));
      const query: any = RDSClient.prototype.query;

      const mysql = new MysqlDataSource({ ...mysqlOptions, initRetryTimes: 0 });
      await assert.rejects(mysql.ready(), /fake error/);
      assert.strictEqual(query.called, 1);
      assert.deepStrictEqual(query.lastCalledArguments, [ mysqlOptions.initSql ]);
    });

    it('init should retry', async () => {
      let i = 0;
      mm(RDSClient.prototype, 'query', () => {
        throw new Error(`fake error ${++i}`);
      });
      const query: any = RDSClient.prototype.query;

      const mysql = new MysqlDataSource({ ...mysqlOptions, initRetryTimes: 3 });
      await assert.rejects(mysql.ready(), /fake error 3/);
      assert.strictEqual(query.called, 3);
    });

    it('should success after retry', async () => {
      let i = 0;
      mm(RDSClient.prototype, 'query', async () => {
        if (i === 0) {
          i++;
          throw new Error('fake error');
        }
      });
      const query: any = RDSClient.prototype.query;

      const mysql = new MysqlDataSource({ ...mysqlOptions, initRetryTimes: 2 });
      await assert.doesNotReject(mysql.ready());
      assert.strictEqual(query.called, 2);
    });
  });

  describe('execute', () => {
    let dataSource: DataSource<Foo>;
    let tableModel: TableModel<Foo>;
    let forker: DatabaseForker;

    before(async () => {
      forker = new DatabaseForker('unittest', mysqlOptions);
      await forker.forkDb(path.join(__dirname, './fixtures/modules/dal'));
      const mysql = new MysqlDataSource(mysqlOptions);
      await mysql.ready();

      tableModel = TableModel.build(Foo);
      const sqlMapLoader = new SqlMapLoader(tableModel, BaseFooDAO, console as any);
      const sqlMap = sqlMapLoader.load();
      dataSource = new DataSource(tableModel, mysql, sqlMap);
    });

    after(async () => {
      await forker.destroy();
    });

    it('execute should work', async () => {
      const foo = new Foo();
      foo.name = 'name';
      foo.col1 = 'col1';
      foo.bitColumn = Buffer.from([ 0, 0 ]);
      foo.boolColumn = 0;
      foo.tinyIntColumn = 0;
      foo.smallIntColumn = 1;
      foo.mediumIntColumn = 3;
      foo.intColumn = 3;
      foo.bigIntColumn = '00099';
      foo.decimalColumn = '00002.33333';
      foo.floatColumn = 2.3;
      foo.doubleColumn = 2.3;
      foo.dateColumn = new Date('2024-03-16T16:00:00.000Z');
      foo.dateTimeColumn = new Date('2024-03-16T01:26:58.677Z');
      foo.timestampColumn = new Date('2024-03-16T01:26:58.677Z');
      foo.timeColumn = '838:59:50.123';
      foo.yearColumn = 2024;
      foo.varCharColumn = 'var_char';
      foo.binaryColumn = Buffer.from('b');
      foo.varBinaryColumn = Buffer.from('var_binary');
      foo.tinyBlobColumn = Buffer.from('tiny_blob');
      foo.tinyTextColumn = 'text';
      foo.blobColumn = Buffer.from('blob');
      foo.textColumn = 'text';
      foo.mediumBlobColumn = Buffer.from('medium_blob');
      foo.longBlobColumn = Buffer.from('long_blob');
      foo.mediumTextColumn = 'medium_text';
      foo.longTextColumn = 'long_text';
      foo.enumColumn = 'A';
      foo.setColumn = 'B';
      foo.geometryColumn = { x: 10, y: 10 };
      foo.pointColumn = { x: 10, y: 10 };
      foo.lineStringColumn = [
        { x: 15, y: 15 },
        { x: 20, y: 20 },
      ];
      foo.polygonColumn = [
        [
          { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
        ], [
          { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 5 },
        ],
      ];
      foo.multipointColumn = [
        { x: 0, y: 0 }, { x: 20, y: 20 }, { x: 60, y: 60 },
      ];
      foo.multiLineStringColumn = [
        [
          { x: 10, y: 10 }, { x: 20, y: 20 },
        ], [
          { x: 15, y: 15 }, { x: 30, y: 15 },
        ],
      ];
      foo.multiPolygonColumn = [
        [
          [
            { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
          ],
        ],
        [
          [
            { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 5 },
          ],
        ],
      ];
      foo.geometryCollectionColumn = [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
        [
          { x: 15, y: 15 }, { x: 20, y: 20 },
        ],
      ];
      foo.jsonColumn = {
        hello: 'json',
      };
      const rowValue = TableModelInstanceBuilder.buildRow(foo, tableModel);
      const insertResult: InsertResult = await dataSource.executeRawScalar('insert', rowValue);
      assert(insertResult.insertId);
      foo.id = insertResult.insertId;

      const updateResult: UpdateResult = await dataSource.executeRawScalar('update', {
        primary: {
          id: insertResult.insertId,
        },
        $name: 'update_name',
      });
      assert.equal(updateResult.affectedRows, 1);
      foo.name = 'update_name';

      const findRow = await dataSource.executeScalar('findByPrimary', {
        $id: insertResult.insertId,
      });
      assert(findRow);
      assert.deepStrictEqual(findRow, foo);

      const deleteRow: DeleteResult = await dataSource.executeRawScalar('delete', {
        id: insertResult.insertId,
      });
      assert.equal(deleteRow.affectedRows, 1);

      const findRow2 = await dataSource.executeScalar('findByPrimary', {
        $id: insertResult.insertId,
      });
      assert.equal(findRow2, null);

      const res = await dataSource.paginate('findByPrimary', {}, 1, 10);
      assert(res.total === 0);
    });

    it('executeType should work', async () => {
      const mysql = new MysqlDataSource({
        ...mysqlOptions,
        supportBigNumbers: true,
        bigNumberStrings: true,
        executeType: 'execute',
      });
      await mysql.ready();
      const originExecute = (mysql as any).client.execute;
      let executeCalled = false;
      mm((mysql as any).client, 'execute', async (sql, params) => {
        executeCalled = true;
        return Reflect.apply(originExecute, (mysql as any).client, [ sql, params ]);
      });

      tableModel = TableModel.build(Foo);
      const sqlMapLoader = new SqlMapLoader(tableModel, BaseFooDAO, console as any);
      const sqlMap = sqlMapLoader.load();
      dataSource = new DataSource(tableModel, mysql, sqlMap);
      const foo = new Foo();
      foo.name = 'name';
      foo.col1 = 'col1';
      foo.bitColumn = Buffer.from([ 0, 0 ]);
      foo.boolColumn = 0;
      foo.tinyIntColumn = 0;
      foo.smallIntColumn = 1;
      foo.mediumIntColumn = 3;
      foo.intColumn = 3;
      foo.bigIntColumn = '99';
      foo.decimalColumn = '00002.33333';
      foo.floatColumn = 0;
      foo.doubleColumn = 2.3;
      foo.dateColumn = new Date('2024-03-16T16:00:00.000Z');
      foo.dateTimeColumn = new Date('2024-03-16T01:26:58.677Z');
      foo.timestampColumn = new Date('2024-03-16T01:26:58.677Z');
      foo.timeColumn = '838:59:50.123';
      foo.yearColumn = 2024;
      foo.varCharColumn = 'var_char';
      foo.binaryColumn = Buffer.from('b');
      foo.varBinaryColumn = Buffer.from('var_binary');
      foo.tinyBlobColumn = Buffer.from('tiny_blob');
      foo.tinyTextColumn = 'text';
      foo.blobColumn = Buffer.from('blob');
      foo.textColumn = 'text';
      foo.mediumBlobColumn = Buffer.from('medium_blob');
      foo.longBlobColumn = Buffer.from('long_blob');
      foo.mediumTextColumn = 'medium_text';
      foo.longTextColumn = 'long_text';
      foo.enumColumn = 'A';
      foo.setColumn = 'B';
      foo.geometryColumn = { x: 10, y: 10 };
      foo.pointColumn = { x: 10, y: 10 };
      foo.lineStringColumn = [
        { x: 15, y: 15 },
        { x: 20, y: 20 },
      ];
      foo.polygonColumn = [
        [
          { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
        ], [
          { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 5 },
        ],
      ];
      foo.multipointColumn = [
        { x: 0, y: 0 }, { x: 20, y: 20 }, { x: 60, y: 60 },
      ];
      foo.multiLineStringColumn = [
        [
          { x: 10, y: 10 }, { x: 20, y: 20 },
        ], [
          { x: 15, y: 15 }, { x: 30, y: 15 },
        ],
      ];
      foo.multiPolygonColumn = [
        [
          [
            { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
          ],
        ],
        [
          [
            { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 5 },
          ],
        ],
      ];
      foo.geometryCollectionColumn = [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
        [
          { x: 15, y: 15 }, { x: 20, y: 20 },
        ],
      ];
      foo.jsonColumn = {
        hello: 'json',
      };
      const rowValue = TableModelInstanceBuilder.buildRow(foo, tableModel);
      const insertResult: InsertResult = await dataSource.executeRawScalar('insert', rowValue);
      assert(insertResult.insertId);
      foo.id = insertResult.insertId;

      const updateResult: UpdateResult = await dataSource.executeRawScalar('update', {
        primary: {
          id: insertResult.insertId,
        },
        $name: 'update_name',
      });
      assert.equal(updateResult.affectedRows, 1);
      foo.name = 'update_name';

      const findRow = await dataSource.executeScalar('findByPrimary', {
        $id: insertResult.insertId,
      });
      assert(findRow);
      assert.deepStrictEqual(findRow, foo);

      const deleteRow: DeleteResult = await dataSource.executeRawScalar('delete', {
        id: insertResult.insertId,
      });
      assert.equal(deleteRow.affectedRows, 1);

      const findRow2 = await dataSource.executeScalar('findByPrimary', {
        $id: insertResult.insertId,
      });
      assert.equal(findRow2, null);

      const res = await dataSource.paginate('findByPrimary', {
        $id: null,
      }, 1, 10);
      assert(res.total === 0);
      assert(executeCalled);
    });
  });
});
