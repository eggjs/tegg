// import mm from 'egg-mock';
// import path from 'node:path';
// import assert from 'node:assert/strict';

// describe('plugin/controller/test/http/host.test.ts', () => {
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
//       baseDir: path.join(__dirname, '../fixtures/apps/host-controller-app'),
//       framework: require.resolve('egg'),
//     });
//     await app.ready();
//   });

//   after(() => {
//     return app.close();
//   });

//   it('global host should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/apps/1')
//       .set('host', 'foo.eggjs.com')
//       .expect(200)
//       .expect(res => {
//         console.log('res: ', res.text, res.body);
//         assert(res.text === 'foo');
//       });
//   });

//   it('method host should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/apps/2')
//       .set('host', 'bar.eggjs.com')
//       .expect(200)
//       .expect(res => {
//         assert(res.text === 'bar');
//       });
//   });

//   it('multi class host should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/apps/apple')
//       .set('host', 'orange.eggjs.com')
//       .expect(404);

//     await app.httpRequest()
//       .get('/apps/apple')
//       .set('host', 'apple.eggjs.com')
//       .expect(200)
//       .expect(res => {
//         assert(res.text === 'apple');
//       });

//     await app.httpRequest()
//       .get('/apps/a')
//       .set('host', 'a.eggjs.com')
//       .expect(200)
//       .expect(res => {
//         assert(res.text === 'a');
//       });
//   });

//   it('method class host should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/apps/orange')
//       .set('host', 'o.eggjs.com')
//       .expect(200)
//       .expect(res => {
//         assert(res.text === 'orange');
//       });

//     await app.httpRequest()
//       .get('/apps/orange')
//       .set('host', 'orange.eggjs.com')
//       .expect(200)
//       .expect(res => {
//         assert(res.text === 'orange');
//       });

//     await app.httpRequest()
//       .get('/apps/juice')
//       .set('host', 'juice.eggjs.com')
//       .expect(200)
//       .expect(res => {
//         assert(res.text === 'juice');
//       });

//     await app.httpRequest()
//       .get('/apps/juice')
//       .set('host', 'o.eggjs.com')
//       .expect(404);
//   });
// });
