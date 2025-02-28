// import mm from 'egg-mock';
// import path from 'node:path';
// import assert from 'node:assert/strict';

// describe('plugin/controller/test/http/acl.test.ts', () => {
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
//       baseDir: path.join(__dirname, '../fixtures/apps/acl-app'),
//       framework: require.resolve('egg'),
//     });
//     await app.ready();
//   });

//   after(() => {
//     return app.close();
//   });

//   describe('authenticate', () => {
//     describe('authenticate success', () => {
//       it('should ok', async () => {
//         await app.httpRequest()
//           .get('/foo?pass=true')
//           .set('accept', 'application/json')
//           .expect(res => {
//             assert.deepStrictEqual(res.text, 'hello, foo');
//           });
//       });
//     });

//     describe('authenticate failed', () => {
//       describe('json', () => {
//         it('should deny', async () => {
//           await app.httpRequest()
//             .get('/foo')
//             .set('accept', 'application/json')
//             .expect(res => {
//               assert.deepStrictEqual(res.body, {
//                 target: 'http://alipay.com/401',
//                 stat: 'deny',
//               });
//             });
//         });
//       });

//       describe('not json', () => {
//         it('should 302', async () => {
//           await app.httpRequest()
//             .get('/foo')
//             .expect(302)
//             .expectHeader('location', 'http://alipay.com/401');
//         });
//       });
//     });
//   });

//   describe('authorize', () => {
//     describe('authorize success', () => {
//       it('should ok', async () => {
//         await app.httpRequest()
//           .get('/bar?pass=true&code=mock1')
//           .set('accept', 'application/json')
//           .expect(res => {
//             assert.deepStrictEqual(res.text, 'hello, bar');
//           });
//       });
//     });

//     describe('authorize failed', () => {
//       describe('json', () => {
//         it('should deny', async () => {
//           await app.httpRequest()
//             .get('/bar?pass=true&code=mock2')
//             .set('accept', 'application/json')
//             .expect(res => {
//               assert.deepStrictEqual(res.body, {
//                 target: 'http://alipay.com/403',
//                 stat: 'deny',
//               });
//             });
//         });
//       });

//       describe('not json', () => {
//         it('should 302', async () => {
//           await app.httpRequest()
//             .get('/bar?pass=true&code=mock2')
//             .expect(302)
//             .expectHeader('location', 'http://alipay.com/403');
//         });
//       });
//     });
//   });
// });
