import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/host.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/host-controller-app',
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('global host should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/1')
      .set('host', 'foo.eggjs.com')
      .expect(200)
      .expect(res => {
        console.log('res: ', res.text, res.body);
        assert.equal(res.text, 'foo');
      });
  });

  it('method host should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/2')
      .set('host', 'bar.eggjs.com')
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'bar');
      });
  });

  it('multi class host should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/apple')
      .set('host', 'orange.eggjs.com')
      .expect(404);

    await app.httpRequest()
      .get('/apps/apple')
      .set('host', 'apple.eggjs.com')
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'apple');
      });

    await app.httpRequest()
      .get('/apps/a')
      .set('host', 'a.eggjs.com')
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'a');
      });
  });

  it('method class host should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/orange')
      .set('host', 'o.eggjs.com')
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'orange');
      });

    await app.httpRequest()
      .get('/apps/orange')
      .set('host', 'orange.eggjs.com')
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'orange');
      });

    await app.httpRequest()
      .get('/apps/juice')
      .set('host', 'juice.eggjs.com')
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'juice');
      });

    await app.httpRequest()
      .get('/apps/juice')
      .set('host', 'o.eggjs.com')
      .expect(404);
  });
});
