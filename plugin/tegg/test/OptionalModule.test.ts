// import assert from 'node:assert/strict';
// import path from 'node:path';
// import mm from 'egg-mock';
// import { RootProto } from './fixtures/apps/optional-module/app/modules/root/Root';
// import { UsedProto } from './fixtures/apps/optional-module/node_modules/used/Used';
// import { UnusedProto } from './fixtures/apps/optional-module/node_modules/unused/Unused';

// describe('plugin/tegg/test/OptionalModule.test.ts', () => {
//   let app;
//   const fixtureDir = path.join(__dirname, 'fixtures/apps/optional-module');

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
//       const rootProto = await ctx.getEggObject(RootProto);
//       assert(rootProto);
//       const usedProto = await ctx.getEggObject(UsedProto);
//       assert(usedProto);
//       await assert.rejects(async () => {
//         await ctx.getEggObject(UnusedProto);
//       }, /can not get proto for clazz UnusedProto/);
//     });
//   });
// });
