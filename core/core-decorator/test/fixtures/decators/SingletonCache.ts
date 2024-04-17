import { AccessLevel } from '@eggjs/tegg-types';
import { SingletonProto } from '../../..';
import { ICache } from './ICache';

@SingletonProto({
  name: 'cache',
  accessLevel: AccessLevel.PUBLIC,
})
export default class SingletonCache implements ICache {
}
