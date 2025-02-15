import assert from 'node:assert/strict';
import path from 'node:path';
import mm, { MockApplication } from 'egg-mock';
import FooDAO from './fixtures/apps/dal-app/modules/dal/dal/dao/FooDAO';
import { FooService } from './fixtures/apps/dal-app/modules/dal/FooService';
import { MysqlDataSourceManager } from '../lib/MysqlDataSourceManager';

describe('plugin/dal/test/transaction.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../');
    });
    app = mm.app({
      baseDir: path.join(__dirname, './fixtures/apps/dal-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  afterEach(async () => {
    const dataSource = MysqlDataSourceManager.instance.get('dal', 'foo')!;
    await dataSource.query('delete from egg_foo;');
  });

  after(() => {
    return app.close();
  });

  describe('succeed transaction', () => {
    it('should commit', async () => {
      await app.mockModuleContextScope(async () => {
        const fooService = await app.getEggObject(FooService);
        const fooDao = await app.getEggObject(FooDAO);
        await fooService.succeedTransaction();
        const foo1 = await fooDao.findByName('insert_succeed_transaction_1');
        const foo2 = await fooDao.findByName('insert_succeed_transaction_2');
        assert(foo1.length);
        assert(foo2.length);
      });
    });
  });

  describe('failed transaction', () => {
    it('should rollback', async () => {
      await app.mockModuleContextScope(async () => {
        const fooService = await app.getEggObject(FooService);
        const fooDao = await app.getEggObject(FooDAO);
        await assert.rejects(async () => {
          await fooService.failedTransaction();
        });
        const foo1 = await fooDao.findByName('insert_failed_transaction_1');
        const foo2 = await fooDao.findByName('insert_failed_transaction_2');
        assert(!foo1.length);
        assert(!foo2.length);
      });
    });
  });

  describe('transaction should be isolated', () => {
    it('should rollback', async () => {
      await app.mockModuleContextScope(async () => {
        const fooService = await app.getEggObject(FooService);
        const fooDao = await app.getEggObject(FooDAO);
        const [ failedRes, succeedRes ] = await Promise.allSettled([
          fooService.failedTransaction(),
          fooService.succeedTransaction(),
        ]);
        assert.equal(failedRes.status, 'rejected');
        assert.equal(succeedRes.status, 'fulfilled');
        const foo1 = await fooDao.findByName('insert_failed_transaction_1');
        const foo2 = await fooDao.findByName('insert_failed_transaction_2');
        assert(!foo1.length);
        assert(!foo2.length);

        const foo3 = await fooDao.findByName('insert_succeed_transaction_1');
        const foo4 = await fooDao.findByName('insert_succeed_transaction_2');
        assert(foo3.length);
        assert(foo4.length);
      });
    });
  });
});
