import { AccessLevel, ContextProto } from '@eggjs/tegg';

@ContextProto({
  accessLevel: AccessLevel.PRIVATE,
})
export default class BarService {

  public moduleMainBarServiceMethod() {
    return 'moduleMain-BarService-Method';
  }
}
