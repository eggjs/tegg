import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/priority.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/controller-app',
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('/* should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/view/foo')
      .expect(200)
      .expect('hello, view');
  });

  it('/users/group', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/users/group')
      .expect(200)
      .expect('high priority');
  });

  it('/users/* should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/users/foo')
      .expect(200)
      .expect('low priority');
  });
});
