import path from 'path';
import fs from 'fs/promises';
import assert from 'assert';
import mm from 'egg-mock';
import { TimerUtil } from '@eggjs/tegg-common-util';

describe('test/schedule.test.ts', () => {
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

async function getScheduleLogContent(name) {
  const logPath = path.join(__dirname, 'fixtures', name, 'logs', name, `${name}-web.log`);
  // schedule called
  return fs.readFile(logPath, 'utf8');
}
