import { AccessLevel, ContextProto } from '../../..';
import { ICache } from './ICache';

@ContextProto({
  name: 'cache',
  accessLevel: AccessLevel.PUBLIC,
})
export default class ContextCache implements ICache {
}
