import { Prototype, Inject } from '@eggjs/core-decorator';
import AppRepo from './AppRepo';

@Prototype()
export default class UserRepo {
  @Inject()
  appRepo: AppRepo;
}
