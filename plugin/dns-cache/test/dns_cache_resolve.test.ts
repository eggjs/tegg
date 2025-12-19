import mm, { type MockApplication } from 'egg-mock';
import assert from 'assert';
import path from 'path';
import * as utils from './utils';

describe('test/dns_cache_resolve.test.ts', () => {
  let app: MockApplication;
  let url: string = '';

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
    url = url.replace('127.0.0.1', 'localhost');
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should query', () => {
    assert(app.dnsResolver);
    assert(app.dnsResolver.getDnsCache());
  });

  it('should ctx.curl work and set host', async () => {
    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    await app
      .httpRequest()
      .get(
        '/?url=' +
          encodeURIComponent(url + '/get_headers') +
          '&host=localhost.foo.com'
      )
      .expect(200)
      .expect(/"host":"localhost\.foo\.com"/);
    await app
      .httpRequest()
      .get(
        '/?url=' +
          encodeURIComponent(url + '/get_headers') +
          '&Host=localhost2.foo.com'
      )
      .expect(200)
      .expect(/"host":"localhost2\.foo\.com"/);
  });

  it('should throw error when the first dns lookup fail', async () => {
    if (!process.env.CI) {
      app.dnsResolver.setServers(['223.5.5.5', '223.6.6.6']);
    }
    await app
      .httpRequest()
      .get(
        '/?url=' +
          encodeURIComponent('http://notexists-1111111local-domain.com')
      )
      .expect(500)
      .expect(/queryA ENOTFOUND notexists-1111111local-domain\.com/);
  });
});
