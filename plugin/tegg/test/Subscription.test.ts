import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';
import AppService from './fixtures/apps/schedule-app/modules/multi-module-service/AppService.js';

describe('plugin/tegg/test/Subscription.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/schedule-app',
    });
    await app.ready();
  });

  it('should work', async () => {
    let called = false;
    mm(AppService.prototype, 'findApp', () => {
      called = true;
    });
    await app.runSchedule('foo');
    assert(called);
  });
});
