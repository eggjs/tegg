// import assert from 'node:assert/strict';
// import path from 'node:path';
// import mm from 'egg-mock';

// describe('test/lib/EggModuleLoader.test.ts', () => {
//   beforeEach(() => {
//     mm(process.env, 'EGG_TYPESCRIPT', true);
//     mm(process, 'cwd', () => {
//       return path.join(__dirname, '../..');
//     });
//   });

//   afterEach(() => {
//     mm.restore();
//   });

//   describe('has recursive dependency module', () => {
//     it('should throw error', async () => {
//       const app = mm.app({
//         baseDir: path.join(__dirname, '../fixtures/apps/recursive-module-app'),
//         framework: require.resolve('egg'),
//       });
//       await assert.rejects(() => app.ready(), /module has recursive deps/);
//       return app.close();
//     });
//   });

//   describe('module config in wrong order', () => {
//     it('should load module success', async () => {
//       const app = mm.app({
//         baseDir: path.join(__dirname, '../fixtures/apps/wrong-order-app'),
//         framework: require.resolve('egg'),
//       });
//       await app.ready();
//       return app.close();
//     });
//   });

// });
