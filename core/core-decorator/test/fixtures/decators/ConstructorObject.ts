import { SingletonProto } from '../../../src/decorator/SingletonProto';
import { ICache } from './ICache';
import { Inject, InjectOptional } from '../../../src/decorator/Inject';
import { InitTypeQualifier } from '../../../src/decorator/InitTypeQualifier';
import { ObjectInitType } from '@eggjs/tegg-types';
import { ModuleQualifier } from '../../../src/decorator/ModuleQualifier';

@SingletonProto()
export class ConstructorObject {
    constructor(
      @InitTypeQualifier(ObjectInitType.SINGLETON)
      @ModuleQualifier('foo')
      @Inject({ name: 'fooCache'}) readonly xCache: ICache,
      @Inject() readonly cache: ICache,
      @Inject({ optional: true }) readonly optional1?: ICache,
      @InjectOptional() readonly optional2?: ICache,
    ) {
    }
}
