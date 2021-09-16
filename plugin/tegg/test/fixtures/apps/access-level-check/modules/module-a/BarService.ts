import { AccessLevel, ContextProto } from '@eggjs/tegg';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class BarService {

  public moduleABarServiceMethod() {
    return 'moduleA-BarService-Method';
  }
}
