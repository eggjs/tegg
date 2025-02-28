// import assert from 'node:assert/strict';
// import path from 'node:path';
// import mm from 'egg-mock';

// describe('plugin/controller/test/http/edgecase.test.ts', () => {
//   let app;

//   beforeEach(() => {
//     mm(process.env, 'EGG_TYPESCRIPT', true);
//   });

//   afterEach(() => {
//     mm.restore();
//   });

//   before(async () => {
//     mm(process.env, 'EGG_TYPESCRIPT', true);
//     mm(process, 'cwd', () => {
//       return path.join(__dirname, '../..');
//     });
//     app = mm.app({
//       baseDir: path.join(__dirname, '../fixtures/apps/controller-app'),
//       framework: require.resolve('egg'),
//     });
//     await app.ready();
//   });

//   after(() => {
//     return app.close();
//   });

//   it('redirect should work', async () => {
//     await app.httpRequest()
//       .get('/redirect')
//       .expectHeader('location')
//       .expect(302);
//   });

//   it('empty should work', async () => {
//     await app.httpRequest()
//       .get('/empty')
//       .expect(204);
//   });

//   it('should case sensitive', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/Middleware/Method')
//       .expect(200)
//       .expect(res => {
//         assert(res.text === 'hello, view');
//       });
//   });
// });
