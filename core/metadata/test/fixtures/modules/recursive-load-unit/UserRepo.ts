import { Prototype, Inject } from '@eggjs/core-decorator';
import type AppRepo from './AppRepo.ts';

@Prototype()
export default class UserRepo {
  @Inject()
  appRepo: AppRepo;
}
