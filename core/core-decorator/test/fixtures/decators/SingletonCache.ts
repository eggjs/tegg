import { AccessLevel } from '@eggjs/tegg-types';
import { SingletonProto } from '../../../src/index.js';
import { ICache } from './ICache.js';

@SingletonProto({
  name: 'cache',
  accessLevel: AccessLevel.PUBLIC,
})
export default class SingletonCache implements ICache {
}
