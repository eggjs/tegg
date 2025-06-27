import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { StandAloneAppTest } from './Utils';

describe('standalone/standalone/test/MultiInstanceProto.test.ts', () => {
  const name = 'multi-callback-instance-module';
  const fixturePath = StandAloneAppTest.baseDir(name);

  afterEach(async () => {
    await fs.unlink(path.join(fixturePath, 'main', 'foo.log'));
    await fs.unlink(path.join(fixturePath, 'main', 'bar.log'));
    await fs.unlink(path.join(fixturePath, 'biz', 'fooBiz.log'));
    await fs.unlink(path.join(fixturePath, 'biz', 'barBiz.log'));

    await StandAloneAppTest.removeFixtureTmp();
  });

  it('should work', async () => {
    await StandAloneAppTest.run(name);
    const fooContent = await fs.readFile(path.join(fixturePath, 'main', 'foo.log'), 'utf8');
    const barContent = await fs.readFile(path.join(fixturePath, 'main', 'bar.log'), 'utf8');
    assert(fooContent.includes('hello, foo'));
    assert(barContent.includes('hello, bar'));

    const fooBizContent = await fs.readFile(path.join(fixturePath, 'biz', 'fooBiz.log'), 'utf8');
    const barBizContent = await fs.readFile(path.join(fixturePath, 'biz', 'barBiz.log'), 'utf8');
    assert(fooBizContent.includes('hello, foo biz'));
    assert(barBizContent.includes('hello, bar biz'));
  });
});
