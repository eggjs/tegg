import { Prototype, Inject } from '@eggjs/core-decorator';
import type UserRepo from './UserRepo.ts';

@Prototype()
export default class SprintRepo {
  @Inject()
  userRepo: UserRepo;

  async save() {
    return Promise.resolve();
  }
}
