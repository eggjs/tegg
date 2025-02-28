// import mm from 'egg-mock';
// import path from 'node:path';
// import assert from 'node:assert/strict';

// describe('plugin/controller/test/http/request.test.ts', () => {
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
//       baseDir: path.join(__dirname, '../fixtures/apps/http-inject-app'),
//       framework: require.resolve('egg'),
//     });
//     await app.ready();
//   });

//   after(() => {
//     return app.close();
//   });
//   const [ nodeMajor ] = process.versions.node.split('.').map(v => Number(v));
//   if (nodeMajor >= 16) {
//     it('Request should work', async () => {
//       app.mockCsrf();
//       const param = {
//         name: 'foo',
//         desc: 'mock-desc',
//       };
//       const headerKey = 'test-header';
//       await app.httpRequest()
//         .post('/apps/testRequest')
//         .send(param)
//         .set('test', headerKey)
//         .set('cookie', 'test=foo')
//         .expect(200)
//         .expect(res => {
//           assert(res.body.headers.test === headerKey);
//           assert(res.body.method === 'POST');
//           assert(res.body.requestBody === JSON.stringify(param));
//           assert(res.body.cookies === 'foo');
//         });
//     });
//   }

// });
