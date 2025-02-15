import { AccessLevel } from '@eggjs/tegg-types';
import { ContextProto } from '../../../src/index.js';
import { ICache } from './ICache.js';

@ContextProto({
  name: 'cache',
  accessLevel: AccessLevel.PUBLIC,
})
export default class ContextCache implements ICache {
}
