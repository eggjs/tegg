import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mm, MockApplication } from '@eggjs/mock';
import { TimerUtil } from '@eggjs/tegg-common-util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('plugin/schedule/test/schedule.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'schedule-app',
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('schedule should work', async () => {
    await TimerUtil.sleep(1000);
    const scheduleLog = await getScheduleLogContent('schedule-app');
    assert.match(scheduleLog, /schedule called/);
  });
});

async function getScheduleLogContent(name: string) {
  const logPath = path.join(__dirname, 'fixtures', name, 'logs', name, `${name}-web.log`);
  // schedule called
  return fs.readFile(logPath, 'utf8');
}
