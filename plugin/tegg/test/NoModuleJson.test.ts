// import assert from 'node:assert/strict';
// import path from 'node:path';
// import mm from 'egg-mock';

// describe('plugin/tegg/test/NoModuleJson.test.ts', () => {
//   let app;
//   const fixtureDir = path.join(__dirname, 'fixtures/apps/app-with-no-module-json');

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
//     await app.httpRequest()
//       .get('/config')
//       .expect(200)
//       .expect(res => {
//         const baseDir = res.body.baseDir;
//         assert(baseDir === fixtureDir);
//       });
//   });
// });
