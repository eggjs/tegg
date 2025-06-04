import { KoaRouter } from '@eggjs/router';
import { AccessLevel, InnerObjectProto } from '@eggjs/tegg';

@InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })
export class FetchRouter extends KoaRouter {}
