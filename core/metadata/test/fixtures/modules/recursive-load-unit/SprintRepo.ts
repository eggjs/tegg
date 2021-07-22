import { Prototype, Inject } from '@eggjs/core-decorator';
import UserRepo from './UserRepo';

@Prototype()
export default class SprintRepo {
  @Inject()
  userRepo: UserRepo;

  async save() {
    return Promise.resolve();
  }
}
