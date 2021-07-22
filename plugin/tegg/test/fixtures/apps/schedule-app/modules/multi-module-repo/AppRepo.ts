import { AccessLevel, ContextProto } from '@eggjs/tegg';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppRepo {

  public async findApp(): Promise<Record<string, any>> {
    return {};
  }
}
