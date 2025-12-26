import mm, { type MockApplication } from 'egg-mock';
import assert from 'assert';
import path from 'path';
import * as utils from './utils';

describe('test/dns_cache_resolve_localhost.test.ts', () => {
  let app: MockApplication;
  let url = '';

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: path.join(
        __dirname,
        './fixtures/apps/dns_cache_resolve_localhost',
      ),
      framework: require.resolve('egg'),
    });
    await app.ready();
    url = await utils.startLocalServer();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should dns resolver exist', () => {
    assert(app.dnsResolver);
    assert(app.dnsResolver.getDnsCache());
  });

  it('should ctx.curl localhost work any way', async () => {
    app.dnsResolver.setServers([ '8.8.8.8' ]); // should support localhost
    // app.dnsResolver.setServers([ '223.5.5.5', '223.6.6.6' ]); // should support localhost

    // Test with 127.0.0.1 (no DNS lookup needed for IP addresses)
    const result1 = await app.curl(url + '/get_headers', { method: 'GET' });
    assert(result1.status === 200);
    assert(result1.data);

    url = url.replace('127.0.0.1', 'localhost');

    const result2 = await app.curl(url + '/get_headers', { method: 'GET' });
    assert(result2.status === 200);
    assert(result2.data);
  });
});
