import { Inject, SingletonProto } from '@eggjs/core-decorator';
import { Secret, SecretQualifier } from '../foo/Secret';

@SingletonProto()
export class App2 {
  @Inject()
  @SecretQualifier('app2')
  secret: Secret;
}
