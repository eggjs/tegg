import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/acl.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/acl-app',
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  describe('authenticate', () => {
    describe('authenticate success', () => {
      it('should ok', async () => {
        await app.httpRequest()
          .get('/foo?pass=true')
          .set('accept', 'application/json')
          .expect(res => {
            assert.deepStrictEqual(res.text, 'hello, foo');
          });
      });
    });

    describe('authenticate failed', () => {
      describe('json', () => {
        it('should deny', async () => {
          await app.httpRequest()
            .get('/foo')
            .set('accept', 'application/json')
            .expect(res => {
              assert.deepStrictEqual(res.body, {
                target: 'http://alipay.com/401',
                stat: 'deny',
              });
            });
        });
      });

      describe('not json', () => {
        it('should 302', async () => {
          await app.httpRequest()
            .get('/foo')
            .expect(302)
            .expect('location', 'http://alipay.com/401');
        });
      });
    });
  });

  describe('authorize', () => {
    describe('authorize success', () => {
      it('should ok', async () => {
        await app.httpRequest()
          .get('/bar?pass=true&code=mock1')
          .set('accept', 'application/json')
          .expect(res => {
            assert.deepStrictEqual(res.text, 'hello, bar');
          });
      });
    });

    describe('authorize failed', () => {
      describe('json', () => {
        it('should deny', async () => {
          await app.httpRequest()
            .get('/bar?pass=true&code=mock2')
            .set('accept', 'application/json')
            .expect(res => {
              assert.deepStrictEqual(res.body, {
                target: 'http://alipay.com/403',
                stat: 'deny',
              });
            });
        });
      });

      describe('not json', () => {
        it('should 302', async () => {
          await app.httpRequest()
            .get('/bar?pass=true&code=mock2')
            .expect(302)
            .expect('location', 'http://alipay.com/403');
        });
      });
    });
  });
});
