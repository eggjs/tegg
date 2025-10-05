import { Inject, SingletonProto } from '@eggjs/tegg';

import type { Secret} from '../foo/Secret.ts';
import { SecretQualifier } from '../foo/Secret.ts';

@SingletonProto()
export class App2 {
  @Inject()
  @SecretQualifier('app2')
  secret: Secret;
}
