import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';
import { CountService } from './CountService';
import sleep from 'mz-modules/sleep';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class BackgroundService {
  @Inject()
  private readonly backgroundTaskHelper:BackgroundTaskHelper;

  @Inject()
  private readonly countService: CountService;

  async backgroundAdd() {
    this.backgroundTaskHelper.run(async () => {
      await sleep(1000);
      this.countService.count += 1;
    });
  }
}
