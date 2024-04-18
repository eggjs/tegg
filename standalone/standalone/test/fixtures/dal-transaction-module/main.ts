import { ContextProto, Inject } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';
import { Foo } from './Foo';
import { FooService } from './FooService';
import FooDAO from './dal/dao/FooDAO';


@Runner()
@ContextProto()
export class FooRunner implements MainRunner<Array<Array<Foo>>> {
  @Inject()
  fooService: FooService;

  @Inject()
  private readonly fooDAO: FooDAO;

  async main(): Promise<Array<Array<Foo>>> {
    await Promise.allSettled([
      this.fooService.succeedTransaction(),
      this.fooService.failedTransaction(),
    ]);
    return await Promise.all([
      this.fooDAO.findByName('insert_succeed_transaction_1'),
      this.fooDAO.findByName('insert_succeed_transaction_2'),
      this.fooDAO.findByName('insert_failed_transaction_1'),
      this.fooDAO.findByName('insert_failed_transaction_2'),
    ]);
  }
}
