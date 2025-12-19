import mm, { type MockApplication } from 'egg-mock';
import assert from 'assert';
import path from 'path';
import * as utils from './utils';

describe('test/dns_cache_resolve.test.ts', () => {
  let app: MockApplication;
  let url = '';

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, './fixtures/apps/dns_cache_resolve'),
      framework: require.resolve('egg'),
    });
    await app.ready();
    url = await utils.startLocalServer();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should query', () => {
    assert(app.dnsResolver);
    assert(app.dnsResolver.getDnsCache());
  });

  it('should ctx.curl dns work', async () => {
    app.dnsResolver.setServers([ '8.8.8.8' ]);

    // Test with 127.0.0.1 (no DNS lookup needed for IP addresses)
    const result1 = await app.curl(url + '/get_headers', { method: 'GET' });
    assert(result1.status === 200);
    assert(result1.data);

    // Test with real domain name (requires DNS resolution)
    url = url.replace('127.0.0.1', 'localhost');
    try {
      const result2 = await app.curl(url + '/get_headers', { method: 'GET' });
      assert(result2.status === 500);
    } catch (error) {
      // google name server won't resolve localhost, so it should fail
      assert(error);
      assert(error.message.includes('queryA ENOTFOUND localhost'));
    }

    app.dnsResolver.setServers([ '223.5.5.5', '223.6.6.6' ]);
    const result3 = await app.curl(url + '/get_headers', { method: 'GET' });
    // aliyun name server can resolve localhost
    assert(result3.status === 200);

    const res = await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent('https://www.aliyun.com/'));
    assert(res.status === 200 || res.status === 301 || res.status === 302);
  });

  it('should throw error when the first dns lookup fail', async () => {
    app.dnsResolver.setServers([ '223.5.5.5', '223.6.6.6' ]);
    await app
      .httpRequest()
      .get(
        '/?url=' +
          encodeURIComponent('http://notexists-1111111local-domain.com'),
      )
      .expect(500)
      .expect(/queryA ENOTFOUND notexists-1111111local-domain\.com/);
  });
});
