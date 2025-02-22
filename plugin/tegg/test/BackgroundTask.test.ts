// import assert from 'node:assert/strict';
// import path from 'node:path';
// import fs from 'node:fs';
// import mm from 'egg-mock';
// import { TimerUtil } from '@eggjs/tegg-common-util';
// import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
// import { BackgroundTaskHelper } from '@eggjs/tegg';
// import { EggContext, EggContextLifecycleUtil } from '@eggjs/tegg-runtime';
// import { CountService } from './fixtures/apps/background-app/modules/multi-module-background/CountService';

// describe('plugin/tegg/test/BackgroundTask.test.ts', () => {
//   const appDir = path.join(__dirname, 'fixtures/apps/background-app');
//   let app;

//   after(async () => {
//     await app.close();
//   });

//   afterEach(() => {
//     mm.restore();
//   });

//   before(async () => {
//     mm(process.env, 'EGG_TYPESCRIPT', true);
//     mm(process, 'cwd', () => {
//       return path.join(__dirname, '..');
//     });
//     app = mm.app({
//       baseDir: appDir,
//       framework: require.resolve('egg'),
//     });
//     await app.ready();
//   });

//   it('background task should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/background')
//       .expect(200);

//     const countService = await app.getEggObject(CountService);
//     assert(countService.count === 0);
//     await TimerUtil.sleep(1000);
//     assert(countService.count === 1);
//   });

//   it('background timeout with humanize error info', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/backgroudTimeout')
//       .expect(200);

//     await TimerUtil.sleep(7000);
//     const errorLog = fs.readFileSync(path.resolve(appDir, 'logs/egg-app/common-error.log'), 'utf-8');
//     assert(errorLog.includes('Can not read property `testObj` because egg ctx has been destroyed ['));
//   });

//   it('should release', async () => {
//     let teggCtx: EggContext;
//     await app.mockModuleContextScope(async ctx => {
//       teggCtx = ctx[TEGG_CONTEXT];
//       const backgroundTaskHelper = await ctx.getEggObject(BackgroundTaskHelper);
//       backgroundTaskHelper.run(async () => {
//         // do nothing
//       });
//     });
//     const lifecycleList = EggContextLifecycleUtil.getObjectLifecycleList(teggCtx!);
//     assert(lifecycleList.length === 0);
//   });

//   it('config should work', async () => {
//     await app.mockModuleContextScope(async ctx => {
//       const backgroundTaskHelper = await ctx.getEggObject(BackgroundTaskHelper);
//       assert(backgroundTaskHelper.timeout === Infinity);
//     });
//   });
// });
