import { AccessLevel, SingletonProto, Inject, ContextProto } from '@eggjs/tegg';
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';
import { CountService } from './CountService';
import sleep from 'mz-modules/sleep';
import assert from 'assert';

@ContextProto()
export class TestObj {
  ok = true;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class BackgroundService {
  @Inject()
  private readonly backgroundTaskHelper:BackgroundTaskHelper;

  @Inject()
  testObj: TestObj;

  @Inject()
  private readonly countService: CountService;

  async backgroundAdd(delay = 1000) {
    this.backgroundTaskHelper.timeout = 5000;
    this.backgroundTaskHelper.run(async () => {
      await sleep(delay);
      assert(this.testObj.ok);
      this.countService.count += 1;
    });
  }
}
