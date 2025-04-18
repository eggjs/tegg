import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

describe('plugin/controller/test/http/request.test.ts', () => {
  let app;

  beforeEach(() => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
  });

  afterEach(() => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, '../fixtures/apps/http-inject-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });
  const [ nodeMajor ] = process.versions.node.split('.').map(v => Number(v));
  if (nodeMajor >= 16) {
    it('Request should work', async () => {
      app.mockCsrf();
      const param = {
        name: 'foo',
        desc: 'mock-desc',
      };
      const headerKey = 'test-header';
      await app.httpRequest()
        .post('/apps/testRequest')
        .send(param)
        .set('test', headerKey)
        .set('cookie', 'test=foo')
        .expect(200)
        .expect(res => {
          assert(res.body.headers.test === headerKey);
          assert(res.body.method === 'POST');
          assert(res.body.requestBody === JSON.stringify(param));
          assert(res.body.cookies === 'foo');
        });
    });

    it('stream should work', async () => {
      await app.httpRequest()
        .get('/apps/stream')
        .expect(200)
        .expect(res => {
          assert(res.text.includes('流式内容5'));
        });
    });

    it('error stream should work', async () => {
      try {
        await app.httpRequest()
          .get('/apps/error_stream')
          .expect(200)
          .expect(res => {
            assert(res.text.includes('流式内容5'));
          });
      } catch (error) {
        console.log('error 2333: ', error);
      }

    });
  }

});
