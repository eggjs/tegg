import path from 'path';
import fs from 'fs/promises';
import assert from 'assert';
import mm from 'egg-mock';
import { TimerUtil } from '@eggjs/tegg-common-util';

describe('plugin/schedule/test/schedule.test.ts', () => {
  describe('cluster mode', () => {
    let app;

    afterEach(async () => {
      mm.restore();
    });

    before(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      const cluster = mm.cluster as any;
      app = cluster({
        baseDir: path.join(__dirname, './fixtures/schedule-app'),
        workers: 1,
        cache: false,
        framework: path.dirname(require.resolve('egg/package.json')),
        opt: {
          cwd: path.join(__dirname, '../'),
          execArgv: [ '-r', require.resolve('ts-node/register') ],
        },
      })
        .debug(true);
      await app.ready();
    });

    after(() => {
      return app.close();
    });

    it('schedule should work', async () => {
      await TimerUtil.sleep(1000);
      const scheduleLog = await getScheduleLogContent('schedule-app');
      assert(/schedule called/.test(scheduleLog));
    });
  });

  describe('app mode - schedule unregister', () => {
    let app;

    beforeEach(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      app = mm.app({
        baseDir: path.join(__dirname, './fixtures/schedule-app'),
        framework: path.dirname(require.resolve('egg/package.json')),
      } as any);
      await app.ready();
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
      mm.restore();
    });

    it('should unregister schedule when app closes', async () => {
      // Verify scheduleWorker exists and has registered schedules
      assert(app.scheduleWorker, 'scheduleWorker should exist');
      const scheduleItems = app.scheduleWorker.scheduleItems;
      const scheduleKeysBefore = Object.keys(scheduleItems);
      assert(scheduleKeysBefore.length > 0, 'Should have registered schedules');

      // Find the subscriber schedule key
      const subscriberKey = scheduleKeysBefore.find(key => key.includes('Subscriber'));
      assert(subscriberKey, 'Should have Subscriber schedule registered');
      assert(scheduleItems[subscriberKey], 'Subscriber schedule should exist before close');

      // Close the app (this triggers LoadUnit destruction)
      await app.close();
      app = null;

      // Verify schedule was unregistered by checking the scheduleItems object directly
      // Note: We check the same object reference, not Object.keys() again
      assert.strictEqual(
        scheduleItems[subscriberKey],
        undefined,
        'Schedule should be unregistered after app close',
      );
    });
  });
});

async function getScheduleLogContent(name: string) {
  const logPath = path.join(__dirname, 'fixtures', name, 'logs', name, `${name}-web.log`);
  return fs.readFile(logPath, 'utf8');
}
