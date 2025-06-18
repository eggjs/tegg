import { AccessLevel, InnerObjectProto } from '../../..';

@InnerObjectProto()
export class Router {}

@InnerObjectProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'customRouter',
})
export class OtherRouter {}
