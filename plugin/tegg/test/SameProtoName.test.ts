// import assert from 'node:assert/strict';
// import path from 'node:path';
// import mm from 'egg-mock';
// import { BarService } from './fixtures/apps/same-name-protos/app/modules/module-a/BarService';

// describe('plugin/tegg/test/SameProtoName.test.ts', () => {
//   let app;
//   const fixtureDir = path.join(__dirname, 'fixtures/apps/same-name-protos');

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
//       baseDir: fixtureDir,
//       framework: require.resolve('egg'),
//     });
//     await app.ready();
//   });

//   it('should work', async () => {
//     await app.mockModuleContextScope(async ctx => {
//       const barService = await ctx.getEggObject(BarService);
//       assert(barService);
//       assert(barService.fooService);
//     });
//   });
// });
