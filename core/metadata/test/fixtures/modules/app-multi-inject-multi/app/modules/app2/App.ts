import { Inject, ModuleQualifier, SingletonProto } from '@eggjs/core-decorator';
import type { Secret} from '../foo/Secret.js';
import { SecretQualifier } from '../foo/Secret.js';

@SingletonProto()
export class App2 {
  @Inject()
  @ModuleQualifier('app2')
  @SecretQualifier('1')
  secret: Secret;
}
