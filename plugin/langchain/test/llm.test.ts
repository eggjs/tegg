import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';


describe('plugin/langchain/test/llm.test.ts', () => {
  if (parseInt(process.version.slice(1, 3)) > 17) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ChatOpenAIModel } = require('../lib/ChatOpenAI');
    let app;

    after(async () => {
      await app.close();
    });

    afterEach(() => {
      mm.restore();
    });

    before(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return path.join(__dirname, '..');
      });
      app = mm.app({
        baseDir: path.join(__dirname, 'fixtures/apps/langchain'),
        framework: path.dirname(require.resolve('egg')),
      });
      await app.ready();
    });

    after(() => {
      return app.close();
    });

    it('should work', async () => {
      mm(ChatOpenAIModel.prototype, 'invoke', async () => {
        return {
          text: 'hello world',
        };
      });
      const res = await app.httpRequest()
        .get('/llm/hello')
        .expect(200);
      assert.deepStrictEqual(res.body, {
        text: 'hello world',
      });
    });
  }
});
