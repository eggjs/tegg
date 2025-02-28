// import mm from 'egg-mock';
// import path from 'node:path';
// import assert from 'node:assert/strict';

// describe('plugin/controller/test/http/middleware.test.ts', () => {
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

//   it('global middleware should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/middleware/global')
//       .expect(200)
//       .expect(res => {
//         assert(res.body.count === 0);
//       });
//   });

//   it('method middleware should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/middleware/method')
//       .expect(200)
//       .expect(res => {
//         assert(res.body.log === 'use middleware');
//       });
//   });

//   it('method middleware call module should work', async () => {
//     app.mockCsrf();
//     await app.httpRequest()
//       .get('/middleware/methodCallModule')
//       .expect(200);
//   });

//   it('aop controller middleware should work', async () => {
//     app.mockCsrf();
//     const res = await app.httpRequest()
//       .get('/aop/middleware/global')
//       .expect(200);
//     assert.deepStrictEqual(res.body, {
//       method: 'global',
//       count: 0,
//       aopList: [ 'FooControllerAdvice', 'CountAdvice' ],
//     });
//   });

//   it('aop method middleware should work', async () => {
//     app.mockCsrf();
//     const res = await app.httpRequest()
//       .get('/aop/middleware/method')
//       .expect(200);
//     assert.deepStrictEqual(res.body, {
//       method: 'middleware',
//       aopList: [
//         'FooControllerAdvice',
//         'CountAdvice',
//         'BarMethodAdvice',
//         'FooMethodAdvice',
//       ],
//       count: 0,
//     });
//   });
// });
