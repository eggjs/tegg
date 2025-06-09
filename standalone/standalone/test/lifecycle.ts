import path from 'node:path';
import { appMain } from '../src/main';

describe('test/lifecycle.ts', () => {
  it('should loadUnit lifecycle work', async () => {
    const fixture = path.join(__dirname, './fixtures/lifecycle-app');
    const msg: string = await appMain({
      baseDir: fixture,
      env: 'dev',
      name: 'lifecycleApp',
    });

    console.log(msg);
  });
});
